// client/src/lib/firebase.ts
import {
  initializeApp
} from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";

/* 🔑  env से कॉन्फ़िग */
const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* === consistent helper names === */
export const startGoogleRedirect = () => signInWithRedirect(auth, provider); // ⬅️ नया नाम
export const getRedirectUser     = () => getRedirectResult(auth);
export const listenAuth          = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);
export const firebaseSignOut     = () => signOut(auth);
