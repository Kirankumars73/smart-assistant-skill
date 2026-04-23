import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gate: both redirect-result AND first onAuthStateChanged must resolve
  // before we set loading=false. This prevents the race condition where
  // onAuthStateChanged fires with null before getRedirectResult resolves.
  const redirectChecked = useRef(false);
  const authStateReady = useRef(false);

  const tryFinishLoading = () => {
    if (redirectChecked.current && authStateReady.current) {
      setLoading(false);
    }
  };

  // Fetch user role and profile from Firestore
  const fetchUserRole = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData);
        return profileData.role || USER_ROLES.STUDENT;
      }
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
      
      const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
      const isHardcodedAdmin = user.email === ADMIN_EMAIL;
      const finalRole = isHardcodedAdmin ? USER_ROLES.ADMIN : role;
      
      if (!userDoc.exists()) {
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
        const updateData = { lastLogin: new Date().toISOString() };
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

  // Sign in with Google
  // Strategy: try popup first → if blocked (e.g. by ad blocker), fall back to redirect
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user && !isGmailAccount(result.user.email)) {
        await firebaseSignOut(auth);
        setError('Only Gmail accounts are allowed. Please sign in with a @gmail.com email.');
        throw new Error('Only Gmail accounts are allowed.');
      }
    } catch (error) {
      // Popup blocked (likely by ad blocker) → fall back to redirect
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.log('Popup blocked — falling back to redirect sign-in');
        setError(null);
        try {
          await signInWithRedirect(auth, googleProvider);
          // Page navigates away — execution stops here
        } catch (redirectError) {
          console.error('Redirect sign-in error:', redirectError);
          setError(redirectError.message);
          throw redirectError;
        }
        return;
      }
      // User closed popup — not an error
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

  const hasRole = (role) => userRole === role;
  const isAdmin = () => hasRole(USER_ROLES.ADMIN);
  const isFaculty = () => hasRole(USER_ROLES.FACULTY);
  const isStudent = () => hasRole(USER_ROLES.STUDENT);
  const isParent = () => hasRole(USER_ROLES.PARENT);
  const hasFacultyAccess = () => isAdmin() || isFaculty();

  const refreshUserProfile = async () => {
    if (!currentUser) return;
    try {
      const role = await fetchUserRole(currentUser);
      setUserRole(role);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  // GATE 1: Handle redirect result (for when popup was blocked → redirect was used)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('[Auth] Redirect sign-in detected for:', result.user.email);
          if (!isGmailAccount(result.user.email)) {
            await firebaseSignOut(auth);
            setError('Only Gmail accounts are allowed. Please sign in with a @gmail.com email.');
          }
        }
      } catch (err) {
        console.error('Redirect sign-in error:', err);
        setError(err.message);
      } finally {
        redirectChecked.current = true;
        tryFinishLoading();
      }
    };
    handleRedirectResult();
  }, []);

  // GATE 2: Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isGmailAccount(user.email)) {
        setCurrentUser(user);
        
        const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
        const isHardcodedAdmin = user.email === ADMIN_EMAIL;
        
        if (isHardcodedAdmin) {
          setUserRole('admin');
          createUserProfile(user).catch(err =>
            console.error('Error creating user profile:', err)
          );
        } else {
          try {
            await createUserProfile(user);
            const role = await fetchUserRole(user);
            console.log('[Auth] User role fetched:', role);
            setUserRole(role);
          } catch (err) {
            console.error('Error fetching user role:', err);
            setUserRole(USER_ROLES.STUDENT);
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }

      authStateReady.current = true;
      tryFinishLoading();
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
