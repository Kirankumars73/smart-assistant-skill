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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user role from Firestore
  const fetchUserRole = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data().role || USER_ROLES.STUDENT;
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
          isHardcodedAdmin: isHardcodedAdmin, // Mark hardcoded admin
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
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verify Gmail account
      if (!isGmailAccount(user.email)) {
        await firebaseSignOut(auth);
        throw new Error('Only Gmail accounts are allowed. Please sign in with a @gmail.com email.');
      }

      // Create/update user profile
      await createUserProfile(user);
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
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

  // Check if user has faculty or admin access
  const hasFacultyAccess = () => isAdmin() || isFaculty();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && isGmailAccount(user.email)) {
        setCurrentUser(user);
        
        // Hardcoded admin email - check FIRST before fetching from Firestore
        const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';
        const isHardcodedAdmin = user.email === ADMIN_EMAIL;
        
        // If this is the hardcoded admin, set role immediately
        if (isHardcodedAdmin) {
          setUserRole('admin');
          // Create/update profile in background (non-blocking)
          createUserProfile(user).catch(err => 
            console.error('Error creating user profile:', err)
          );
        } else {
          // For other users, set default role first, then update from Firestore
          setUserRole(USER_ROLES.STUDENT); // Default
          
          // Try to create profile and fetch role in background (non-blocking)
          createUserProfile(user)
            .then(() => fetchUserRole(user))
            .then(role => setUserRole(role))
            .catch(err => console.error('Error creating user profile:', err));
        }
        
        // Set loading=false immediately - don't wait for Firestore
        setLoading(false);
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
    loading,
    error,
    signInWithGoogle,
    signOut,
    hasRole,
    isAdmin,
    isFaculty,
    isStudent,
    hasFacultyAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
