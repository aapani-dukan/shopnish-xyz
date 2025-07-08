import { initializeApp, setLogLevel } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  getRedirectResult,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

// ✅ Enable Firebase Debug Logging
setLogLevel("debug");

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("Firebase Init: Attempting to initialize Firebase app with config:", firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Firebase Init: Auth persistence set to local."))
  .catch((error) => console.error("Firebase Init: Error setting auth persistence:", error));

console.log("Firebase Init: Firebase app and auth initialized successfully.");

const createUserIfNotExists = async (user: any) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: "customer",
      createdAt: new Date(),
    });
    console.log("Firebase: User document created.");
  } else {
    console.log("Firebase: User document already exists.");
  }
};

// ✅ Unified Sign-in for both Desktop (popup) and Mobile (redirect)
export const initiateGoogleSignInSmart = async () => {
  try {
    const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

    if (isMobile) {
      console.log("📱 Using signInWithRedirect for mobile");
      await signInWithRedirect(auth, provider);
    } else {
      console.log("💻 Using signInWithPopup for desktop");
      const result = await signInWithPopup(auth, provider);
      await createUserIfNotExists(result.user);
      return result.user;
    }
  } catch (error) {
    console.error("Firebase: Error during smart sign-in:", error);
    throw error;
  }
};

// ✅ Redirect result handler (after signInWithRedirect)
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("Firebase: Redirect result found:", result.user.email);
      await createUserIfNotExists(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Firebase: Error handling redirect result:", error);
    throw error;
  }
};

// ✅ Logout
export const logout = async () => {
  try {
    await firebaseSignOut(auth);
    console.log("Firebase: User signed out.");
  } catch (error) {
    console.error("Firebase: Error signing out:", error);
    throw error;
  }
};

// ✅ Get User Firestore Document
export const getUserDocument = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export { auth, onAuthStateChanged };
