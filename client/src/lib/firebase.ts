import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";

// 🔐 Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "aapani-dukan.firebaseapp.com",
  projectId: "aapani-dukan",
  storageBucket: "aapani-dukan.firebasestorage.app",
  messagingSenderId: "352463214204",
  appId: "1:352463214204:web:a3adc9ef1d8af0de1fdbf9"
};

// 🔌 Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 📡 Google Provider Setup
const provider = new GoogleAuthProvider();
provider.addScope("email");
provider.addScope("profile");

// ✅ Popup-based login
export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

// ✅ Redirect-based login (Used for seller/role-specific flows)
export function initiateGoogleSignInRedirect() {
  return signInWithRedirect(auth, provider);
}

// ✅ Handle redirect result
export function handleRedirectResult() {
  return getRedirectResult(auth);
}

// 🔒 Logout function
export function logout() {
  return signOut(auth);
}
