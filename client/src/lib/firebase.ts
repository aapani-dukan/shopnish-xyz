// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  setLogLevel, // ✅ Firebase Auth के डीबग लॉग के लिए इम्पोर्ट करें
} from "firebase/auth";

// 🔐 Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 🔌 Initialize Firebase App and Auth
let app;
let authInstance;

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    throw new Error("Firebase API Key is missing or undefined. Check your .env file and Render environment variables.");
  }

  // ✅ Firebase Auth SDK के लिए डीबग लॉगिंग सक्षम करें
  setLogLevel('debug'); 
  console.log("Firebase Init: Attempting to initialize Firebase app with config:", {
    projectId: firebaseConfig.projectId,
    apiKeyPreview: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "EMPTY",
  });

  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  
  console.log("Firebase Init: Firebase app and auth initialized successfully.");

} catch (error) {
  console.error("Firebase Init: CRITICAL ERROR during Firebase initialization. This might cause blank pages or auth issues:", error);
}

export const auth = authInstance;

// 📡 Google Provider Setup
export const googleProvider = auth ? new GoogleAuthProvider() : null;

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
 * Google साइन-इन रीडायरेक्ट फ़्लो शुरू करता है।
 * यह ब्राउज़र को Google के ऑथेंटिकेशन पेज पर रीडायरेक्ट करेगा।
 */
export const initiateGoogleSignInRedirect = async () => {
  if (!auth || !googleProvider) {
    console.error("Firebase Auth not initialized. Cannot initiate Google sign-in redirect.");
    throw new Error("Firebase Auth not available.");
  }
  try {
    console.log("Firebase: Initiating Google Sign-In Redirect. Redirecting browser now...");
    await signInWithRedirect(auth, googleProvider);
    // यह फ़ंक्शन ब्राउज़र को रीडायरेक्ट करता है, इसलिए इसके बाद का कोई कोड नहीं चलेगा।
  } catch (error: any) {
    console.error("Firebase: Error initiating Google Sign-In Redirect:", error);
    throw new Error(`Google Sign-In Redirect Error: ${error.message}`);
  }
};

/**
 * Google रीडायरेक्ट के परिणाम को हैंडल करता है (लॉगिन के बाद वापस आने पर)।
 * इसे AuthProvider में कॉल किया जाना चाहिए।
 */
export const handleGoogleRedirectResult = async (): Promise<FirebaseUser | null> => {
  if (!auth) {
    console.error("Firebase Auth not initialized. Cannot handle redirect result.");
    return null;
  }
  try {
    console.log("Firebase: Calling getRedirectResult(auth)...");
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      console.log("Firebase: ✅ getRedirectResult successful. User found:", user.uid);
      // यदि आप टोकन या क्रेडेंशियल चाहते हैं, तो उन्हें यहां प्राप्त कर सकते हैं
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      // const token = credential?.accessToken;
      // const idToken = await user.getIdToken(); 
      return user;
    } else {
      console.log("Firebase: No Google redirect result found from getRedirectResult(auth).");
      return null;
    }
  } catch (error: any) {
    console.error("Firebase: Error handling Google redirect result:", error);
    // एरर के प्रकार के आधार पर, आप यहां अधिक विशिष्ट हैंडलिंग कर सकते हैं
    if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Firebase: Redirect was cancelled (e.g., by another login request).");
    } else if (error.code === 'auth/account-exists-with-different-credential') {
        console.error("Firebase: An account with the same email already exists but with different sign-in credentials.");
    }
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
