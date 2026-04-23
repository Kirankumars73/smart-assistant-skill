import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isGmailAccount, USER_ROLES } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Full user profile from Firestore
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // Fetch user role and profile from Firestore
  const fetchUserRole = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData); // Store full profile
        return profileData.role || USER_ROLES.STUDENT;
      }
      // Default role for new users
      return USER_ROLES.STUDENT;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return USER_ROLES.STUDENT;
    }
  };

  // Create or update user profile in Firestore
  const createUserProfile = async (user, role = USER_ROLES.STUDENT) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      // Hardcoded admin email - PERMANENT ADMIN
      const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
      const isHardcodedAdmin = user.email === ADMIN_EMAIL;
      
      // Force admin role for hardcoded admin email
      const finalRole = isHardcodedAdmin ? USER_ROLES.ADMIN : role;
      
      if (!userDoc.exists()) {
        // New user - create profile
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: finalRole,
          isHardcodedAdmin: isHardcodedAdmin,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else {
        // Existing user - update last login and enforce admin role if hardcoded admin
        const updateData = {
          lastLogin: new Date().toISOString()
        };
        
        // If this is the hardcoded admin, always ensure admin role
        if (isHardcodedAdmin) {
          updateData.role = USER_ROLES.ADMIN;
          updateData.isHardcodedAdmin = true;
        }
        
        await setDoc(userRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  // Sign in with Google (Gmail only)
  // Popup-only strategy — redirect flow is broken in modern Chrome due to
  // third-party cookie partitioning between firebaseapp.com and vercel.app.
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      // Enforce Gmail-only rule
      if (result?.user && !isGmailAccount(result.user.email)) {
        await firebaseSignOut(auth);
        setError('Only Gmail accounts are allowed. Please sign in with a @gmail.com email.');
        throw new Error('Only Gmail accounts are allowed.');
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Popup blocked by browser:', error.code);
        setError(
          'Pop-up was blocked by your browser. Please allow pop-ups for this site:\n' +
          'Chrome → click the 🔒 icon in the address bar → Site settings → Pop-ups → Allow'
        );
        return;
      }
      // User closed the popup themselves — not an error
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Sign in error:', error);
      if (!error.message?.includes('Gmail')) {
        setError(error.message);
      }
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return userRole === role;
  };

  // Check if user is admin
  const isAdmin = () => hasRole(USER_ROLES.ADMIN);

  // Check if user is faculty
  const isFaculty = () => hasRole(USER_ROLES.FACULTY);

  // Check if user is student
  const isStudent = () => hasRole(USER_ROLES.STUDENT);

  // Check if user is parent (NEW)
  const isParent = () => hasRole(USER_ROLES.PARENT);

  // Check if user has faculty or admin access
  const hasFacultyAccess = () => isAdmin() || isFaculty();

  // Refresh user profile from Firestore (useful after updates like parent linking)
  const refreshUserProfile = async () => {
    if (!currentUser) return;
    
    try {
      const role = await fetchUserRole(currentUser);
      setUserRole(role);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  // Listen for auth state changes (popup-only — no redirect to wait for)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isGmailAccount(user.email)) {
        setCurrentUser(user);
        
        // Hardcoded admin email - check FIRST before fetching from Firestore
        const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
        const isHardcodedAdmin = user.email === ADMIN_EMAIL;
        
        // If this is the hardcoded admin, set role immediately
        if (isHardcodedAdmin) {
          setUserRole('admin');
          setLoading(false);
          // Create/update profile in background (non-blocking)
          createUserProfile(user).catch(err =>
            console.error('Error creating user profile:', err)
          );
        } else {
          // For non-admin users, fetch role before unblocking UI
          try {
            await createUserProfile(user);
            const role = await fetchUserRole(user);
            console.log('[Auth] User role fetched:', role);
            setUserRole(role);
          } catch (err) {
            console.error('Error fetching user role:', err);
            setUserRole(USER_ROLES.STUDENT); // Fallback
          } finally {
            setLoading(false);
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);


  const value = {
    currentUser,
    userRole,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    signOut,
    hasRole,
    isAdmin,
    isFaculty,
    isStudent,
    isParent,
    hasFacultyAccess,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
