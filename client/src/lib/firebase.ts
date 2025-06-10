// client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
} from "firebase/auth";



// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChdYrxfxkfj6m04WT0nOBl5xCP62udcPU",
  authDomain: "aapani-dukan.firebaseapp.com",
  projectId: "aapani-dukan",
  storageBucket: "aapani-dukan.firebasestorage.app",
  messagingSenderId: "352463214204",
  appId: "1:352463214204:web:a3adc9ef1d8af0de1fdbf9"
};

// Initialize Firebase




// 🔗 Google Auth Provider
export const provider = new GoogleAuthProvider();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const startGoogleLogin = (role: "seller" | "customer") => {
  sessionStorage.setItem("loginRole", role); // ✅ Role save
  const provider = new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
};
// @ts-ignore
if (typeof window !== "undefined") window.startGoogleLogin = startGoogleLogin;
