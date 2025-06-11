import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";

// ✅ Firebase configuration - values from .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ✅ Initialize Firebase app
export const app = initializeApp(firebaseConfig);

// ✅ Initialize Firebase Auth
export const auth = getAuth(app);

// ✅ Setup Google provider
export const googleProvider = new GoogleAuthProvider();

// ✅ Role-based sign-in using sessionStorage
export const startGoogleLogin = (role: "seller" | "customer" = "customer") => {
  sessionStorage.setItem("loginRole", role); // 🟢 store role for redirect flow
  signInWithRedirect(auth, googleProvider);
};

// ✅ Compatibility alias for older imports
export const initiateGoogleSignInRedirect = startGoogleLogin;

// ✅ Handle redirect result after Google sign-in
export const handleGoogleRedirectResult = () => {
  return getRedirectResult(auth);
};

// ✅ Listen for auth state changes
export const firebaseOnAuthStateChanged = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ✅ Sign out the current user
export const firebaseSignOut = () => {
  return signOut(auth);
};

// ✅ Optional: Debugging helper in browser
// @ts-ignore
if (typeof window !== "undefined") {
  window.startGoogleLogin = startGoogleLogin;
}
