import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app   = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// helper wrappers
export const startGoogleRedirect   = () => signInWithRedirect(auth, new GoogleAuthProvider());
export const getRedirectUser       = () => getRedirectResult(auth);
export const listenAuth            = (cb:(user:any)=>void) => onAuthStateChanged(auth, cb);
export const firebaseSignOut       = () => signOut(auth);
