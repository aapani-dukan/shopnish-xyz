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


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🔗 Google Auth Provider
export const provider = new GoogleAuthProvider();

// 🚀 Redirect-based Login Handler
export const startGoogleLogin = async (role: "seller" | "customer") => {
  localStorage.setItem("userRole", role); // ताकि बाद में पता चले seller login था या customer
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
};
