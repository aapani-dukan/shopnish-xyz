// client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
} from "firebase/auth";

// 🔐 Firebase config (अपना खुद का config यहाँ भरो)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🔗 Google Auth Provider
export const provider = new GoogleAuthProvider();

// 🚀 Redirect-based Login Handler
export const startGoogleLogin = (role: string) => {
  // login करने से पहले role सेट करें ताकि बाद में redirect के बाद route decide हो सके
  sessionStorage.setItem("loginRole", role);
  signInWithRedirect(auth, provider);
};
