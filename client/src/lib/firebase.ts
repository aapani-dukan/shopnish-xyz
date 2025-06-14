// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  User, // Import User type for better typing
} from "firebase/auth";

// Firebase configuration (replace with your actual config!)
// You should get these values from your Firebase project settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // measurementId: "YOUR_MEASUREMENT_ID", // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Get the Auth instance

// --- Authentication Helper Functions ---

// 1. Start Google Sign-In Redirect flow
export const startGoogleRedirect = () => {
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
};

// 2. Get user after redirect (when Google redirects back to your app)
export const getRedirectUserResult = () => {
  return getRedirectResult(auth);
};

// 3. Listen for real-time authentication state changes
// This is crucial for keeping your app's UI in sync with auth state.
export const listenForAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 4. Sign out the current user
export const firebaseSignOut = () => {
  return signOut(auth);
};
