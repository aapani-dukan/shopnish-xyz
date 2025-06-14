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

// 🔧 अपनी ENV values यहाँ लगाइए
const firebaseConfig = {
  apiKey:   import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/* ---------- helpers ---------- */

// (a) Google redirect trigger
export const googleRedirectLogin = () => signInWithRedirect(auth, provider);

// (b) redirect result loader
export const getRedirectUser = () => getRedirectResult(auth);   // <— यही export missing था

// (c) listenAuth  – एक thin wrapper जो useAuth से call होगा
export const listenAuth = (cb: (u: User|null)=>void) =>
  onAuthStateChanged(auth, cb);

// (d) sign-out
export const firebaseSignOut = () => signOut(auth);
