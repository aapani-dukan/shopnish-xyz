import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser, // Firebase User टाइप को एलियास करें
} from "firebase/auth";

// 🔐 Firebase Configuration
// सुनिश्चित करें कि .env फाइल में ये वेरिएबल्स सही ढंग से सेट हैं
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, // जैसे "aapani-dukan.firebaseapp.com"
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,   // जैसे "aapani-dukan"
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🔌 Initialize Firebase App and Auth
// हम इनिटियलाइज़ेशन को एक try-catch ब्लॉक में रैप कर रहे हैं
// ताकि कॉन्फ़िगरेशन एरर्स को पकड़ा जा सके और कंसोल में लॉग किया जा सके।
let app;
let authInstance;

try {
  // सुनिश्चित करें कि apiKey मौजूद है, अन्यथा यह एरर दे सकता है
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    throw new Error("Firebase API Key is missing or undefined. Check your .env file and Render environment variables.");
  }

  console.log("Firebase Init: Attempting to initialize Firebase app with config:", {
    projectId: firebaseConfig.projectId,
    apiKeyPreview: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "EMPTY",
  });

  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  
  console.log("Firebase Init: Firebase app and auth initialized successfully.");

} catch (error) {
  console.error("Firebase Init: CRITICAL ERROR during Firebase initialization. This might cause blank pages or auth issues:", error);
  // यदि यह एरर होती है, तो ऐप ठीक से काम नहीं करेगा।
  // सुनिश्चित करें कि आपके .env वेरिएबल्स और Render के Environment Variables सही हैं।
}

// Firebase Auth इंस्टेंस को एक्सपोर्ट करें। यदि इनिटियलाइज़ेशन विफल होता है, तो यह undefined होगा।
export const auth = authInstance;

// 📡 Google Provider Setup
// GoogleAuthProvider को इनिशियलाइज़ करने के लिए auth इंस्टेंस की आवश्यकता हो सकती है।
// यदि auth इंस्टेंस undefined है, तो GoogleAuthProvider को इनिशियलाइज़ करना विफल हो सकता है।
export const googleProvider = auth ? new GoogleAuthProvider() : null; // यदि auth undefined है तो null सेट करें

if (googleProvider) {
  googleProvider.addScope("email");
  googleProvider.addScope("profile");
  // यह सुनिश्चित करता है कि यूज़र को हमेशा अकाउंट चुनने के लिए प्रॉम्प्ट किया जाए
  googleProvider.setCustomParameters({ prompt: "select_account" }); 
} else {
  console.error("Firebase: GoogleAuthProvider could not be initialized because Firebase auth failed to initialize.");
}

// 🔑 Authentication Functions

/**
 * Google के साथ पॉपअप के माध्यम से साइन-इन करता है।
 * (हमारा वर्तमान फ़्लो रीडायरेक्ट का उपयोग करता है, लेकिन इसे रेफ़रेंस के लिए रखा गया है।)
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    console.error("Firebase Auth not initialized. Cannot sign in with Google.");
    throw new Error("Firebase Auth not available.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Firebase: User signed in with popup:", user);
    return user;
  } catch (error: any) {
    console.error("Firebase: Error signing in with Google popup:", error);
    // Google साइन-इन एरर हैंडलिंग
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Popup closed by user.");
    } else {
      throw new Error(`Google Sign-In Error: ${error.message}`);
    }
  }
};

/**
 * Google साइन-इन रीडायरेक्ट फ़्लो शुरू करता है।
 * यह ब्राउज़र को Google के ऑथेंटिकेशन पेज पर रीडायरेक्ट करेगा।
 */
export const initiateGoogleSignInRedirect = async () => {
  if (!auth || !googleProvider) {
    console.error("Firebase Auth not initialized. Cannot initiate Google sign-in redirect.");
    throw new Error("Firebase Auth not available.");
  }
  try {
    console.log("Firebase: Initiating Google Sign-In Redirect.");
    await signInWithRedirect(auth, googleProvider);
    // यह फ़ंक्शन ब्राउज़र को रीडायरेक्ट करता है, इसलिए इसके बाद का कोड नहीं चलेगा।
  } catch (error: any) {
    console.error("Firebase: Error initiating Google Sign-In Redirect:", error);
    throw new Error(`Google Sign-In Redirect Error: ${error.message}`);
  }
};

/**
 * Google रीडायरेक्ट के परिणाम को हैंडल करता है (लॉगिन के बाद वापस आने पर)।
 * इसे AuthRedirectGuard या app के रूट में कॉल किया जाना चाहिए।
 */
export const handleGoogleRedirectResult = async () => {
  if (!auth) {
    console.error("Firebase Auth not initialized. Cannot handle redirect result.");
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // यह एक FirebaseUser ऑब्जेक्ट है
      const user = result.user;
      console.log("Firebase: Google Redirect Result - User:", user);
      // यदि आप टोकन या क्रेडेंशियल चाहते हैं:
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      // const token = credential?.accessToken;
      // const idToken = await user.getIdToken(); // यूज़र के ID टोकन प्राप्त करने के लिए
      return user;
    } else {
      console.log("Firebase: No Google redirect result found.");
      return null;
    }
  } catch (error: any) {
    console.error("Firebase: Error handling Google redirect result:", error);
    throw new Error(`Google Redirect Result Error: ${error.message}`);
  }
};

/**
 * यूज़र को लॉगआउट करता है।
 */
export const logout = async () => {
  if (!auth) {
    console.error("Firebase Auth not initialized. Cannot logout.");
    throw new Error("Firebase Auth not available.");
  }
  try {
    console.log("Firebase: Attempting to log out user.");
    await signOut(auth);
    console.log("Firebase: User logged out successfully.");
  } catch (error: any) {
    console.error("Firebase: Error during logout:", error);
    throw new Error(`Logout Error: ${error.message}`);
  }
};

// यदि आप बाद में अन्य Firebase सेवाएं जोड़ना चाहते हैं, जैसे Firestore
// import { getFirestore, collection, doc } from "firebase/firestore";
// export const db = app ? getFirestore(app) : null;
