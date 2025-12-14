// Firebase Configuration
// TODO: Replace with your Firebase project credentials from Firebase Console
// Get these from: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBboGxCfkg8ft6yj-mhNYEpOWalkgz3X4Y",
  authDomain: "smart-academic-assistant.firebaseapp.com",
  projectId: "smart-academic-assistant",
  storageBucket: "smart-academic-assistant.firebasestorage.app",
  messagingSenderId: "979256832186",
  appId: "1:979256832186:web:e68835702d41dad0eb9283",
  measurementId: "G-FV5E1JR6Y0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Configure Google Auth Provider for Gmail-only authentication
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'gmail.com', // Restrict to gmail.com domain
  prompt: 'select_account'
});

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student'
};

// Helper function to check if email is Gmail
export const isGmailAccount = (email) => {
  return email && email.endsWith('@gmail.com');
};

export default app;
