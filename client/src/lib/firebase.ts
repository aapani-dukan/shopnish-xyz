// src/lib/firebase.ts

import { initializeApp,setLogLevel } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  
  getRedirectResult, 
  signInWithRedirect // This must be imported for initiateGoogleSignInRedirect
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ✅ Enable Firebase Debug Logging
setLogLevel('debug'); 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log("Firebase Init: Attempting to initialize Firebase app with config:", firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Set authentication persistence to 'local' for long-term sessions
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase Init: Auth persistence set to local.");
  })
  .catch((error) => {
    console.error("Firebase Init: Error setting auth persistence:", error);
  });

console.log("Firebase Init: Firebase app and auth initialized successfully.");

// Function to handle Google sign-in (popup method - typically used when you DON'T want a full page redirect)
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Firebase: Google sign-in successful. User (popup):", user);

    // Check if user document exists in Firestore, if not, create it
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("Firebase: User document does not exist, creating new one.");
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: "customer", // Default role
        createdAt: new Date(),
      });
    } else {
      console.log("Firebase: User document already exists.");
    }
    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn("Firebase: Google sign-in popup closed by user.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.warn("Firebase: Google sign-in popup request cancelled.");
    } else {
      console.error("Firebase: Error during Google sign-in (popup):", error);
    }
    throw error;
  }
};

// ✅ Function to initiate Google Sign-In with Redirect (This is the one your auth.tsx needs)
export const initiateGoogleSignInRedirect = async () => {
  try {
    console.log("Firebase: Initiating Google sign-in with redirect...");
    // This will redirect the user to Google's sign-in page.
    // After successful sign-in, Firebase will redirect back to your app.
    await signInWithRedirect(auth, googleProvider); 
  } catch (error) {
    console.error("Firebase: Error initiating Google sign-in redirect:", error);
    throw error;
  }
};

// Function to handle Google Redirect Result (This is called on page load after redirect)
export const handleGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      console.log("Firebase: Google redirect sign-in successful. User:", user);
      // Ensure user document exists in Firestore after redirect sign-in
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: "customer", // Default role
          createdAt: new Date(),
        });
        console.log("Firebase: User document created after redirect sign-in.");
      }
      return user;
    } else {
      console.log("Firebase: No Google redirect result found.");
      return null;
    }
  } catch (error: any) {
    console.error("Firebase: Error handling Google redirect result:", error);
    throw error;
  }
};


// Function to handle logout
export const logout = async () => {
  try {
    await firebaseSignOut(auth);
    console.log("Firebase: User signed out.");
  } catch (error) {
    console.error("Firebase: Error signing out:", error);
    throw error;
  }
};

// Function to get user document from Firestore
export const getUserDocument = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

// Export auth instance for useAuth hook and onAuthStateChanged listener
export { auth, onAuthStateChanged };

