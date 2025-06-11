// client/src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
} from "firebase/auth";

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChdYrxfxkfj6m04WT0nOBl5xCP62udcPU",
  authDomain: "aapani-dukan.firebaseapp.com",
  projectId: "aapani-dukan",
  storageBucket: "aapani-dukan.firebasestorage.app",
  messagingSenderId: "352463214204",
  appId: "1:352463214204:web:a3adc9ef1d8af0de1fdbf9"
};

// ✅ Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🔐 Google Login Handler — सिर्फ seller के लिए role set करें
export const startGoogleLogin = (role?: "seller") => {
  if (role === "seller") {
    sessionStorage.setItem("loginRole", "seller");
    console.log("🟢 Seller role set in sessionStorage");
  } else {
    // ✅ यहाँ बदलाव: केवल 'loginRole' को हटाएँ, अन्य Firebase-संबंधित आइटम नहीं
    // यह Firebase के इंटरनल सेशन स्टोरेज को प्रभावित नहीं करेगा।
    if (sessionStorage.getItem("loginRole")) { // केवल तभी हटाने का प्रयास करें जब यह मौजूद हो
        sessionStorage.removeItem("loginRole");
        console.log("🟡 loginRole removed from sessionStorage.");
    }
  }

  const provider = new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
};

// ✅ For debugging in browser
// @ts-ignore
if (typeof window !== "undefined") window.startGoogleLogin = startGoogleLogin;
