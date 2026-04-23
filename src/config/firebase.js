// Firebase Configuration
// Environment variables are loaded from .env.local (development) or deployment config (production)

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with long polling (more reliable than WebSockets)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
});

export const functions = getFunctions(app);

// Configure Google Auth Provider
// Note: Gmail-only enforcement is handled in AuthContext via isGmailAccount()
// hd:'gmail.com' is NOT used — it is for Google Workspace domains, not consumer Gmail,
// and causes silent failures with signInWithRedirect.
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
  PARENT: 'parent'
};

// Helper function to check if email is Gmail
export const isGmailAccount = (email) => {
  return email && email.endsWith('@gmail.com');
};

export default app;
