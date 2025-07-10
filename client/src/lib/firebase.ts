// client/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signOut } from "firebase/auth";

// 🔐 तुम्हारा Firebase config
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
};

// 🔁 App initialize करो (duplicate ना हो)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔐 Auth और Provider setup
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ यह logout function एक्सपोर्ट करो
export const logout = () => signOut(auth);

// ✅ बाकी एक्सपोर्ट
export { auth, provider };
