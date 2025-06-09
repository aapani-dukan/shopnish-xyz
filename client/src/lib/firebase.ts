// lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ Redirect-based Google sign-in
export const signInWithGoogle = async () => {
  try {
    return await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Google redirect sign-in error:", error);
    throw error;
  }
};

// ✅ Get user info after redirect completes
export const handleGoogleRedirect = () => getRedirectResult(auth);

export const signOutUser = () => signOut(auth);

export const onAuthStateChange = (callback: (user: any) => void) =>
  onAuthStateChanged(auth, callback);
