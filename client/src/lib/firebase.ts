// client/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

// 🔐 Environment Variables from Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ✅ Initialize Firebase app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Get Firebase Auth instance and Google Provider
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Google redirect-based sign-in
const initiateGoogleSignInSmart = async () => {
  try {
    await signInWithRedirect(auth, provider);
    console.log("Redirecting to Google Sign-in...");
  } catch (error) {
    console.error("initiateGoogleSignInSmart Error:", error);
  }
};

// ✅ Logout
const logout = async () => {
  try {
    await signOut(auth);
    console.log("Firebase: User signed out");
  } catch (error) {
    console.error("Firebase logout error:", error);
  }
};

export {app, auth, provider, initiateGoogleSignInSmart, logout };
