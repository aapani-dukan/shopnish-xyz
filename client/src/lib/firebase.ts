import {
  initializeApp,
  getApps,
  getApp,
} from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  onAuthStateChanged,
  User,
  signOut,
  getRedirectResult,
} from "firebase/auth";

// ✅  Replace with *your* web‑app credentials
const firebaseConfig = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  projectId: "<PROJECT_ID>",
  appId: "<APP_ID>",
};

// Initialise once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

// 👉 Helpers
export const startGoogleRedirect = () => signInWithRedirect(auth, googleProvider);
export const getRedirectUser = () => getRedirectResult(auth);
export const listenAuth = (cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);
export const firebaseSignOut = () => signOut(auth);
