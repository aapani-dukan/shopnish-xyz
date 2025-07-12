// client/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

// ✅ Import config from env.ts instead of Vite env
import { firebaseConfig } from "./env";

// ✅ Initialize Firebase app (safe init)
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

export { app, auth, provider, initiateGoogleSignInSmart, logout };
