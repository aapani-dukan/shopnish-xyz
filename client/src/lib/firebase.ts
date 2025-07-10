// client/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

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

export { auth, provider, initiateGoogleSignInSmart, logout };
