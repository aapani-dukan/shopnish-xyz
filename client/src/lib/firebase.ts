// client/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup, // ✅ signInWithPopup को इम्पोर्ट करें
  getRedirectResult, // ✅ getRedirectResult को इम्पोर्ट करें
  signOut,
  onAuthStateChanged, // ✅ onAuthStateChanged को इम्पोर्ट करें
  User // ✅ User टाइप को इम्पोर्ट करें
} from "firebase/auth";

// ✅ Import config from env.ts
import { firebaseConfig } from "./env";

// ✅ Initialize Firebase app (safe init)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Get Firebase Auth instance and Google Provider
export const auth = getAuth(app); // auth को सीधे एक्सपोर्ट करें
const provider = new GoogleAuthProvider();

// Add scopes for additional user information
provider.addScope('profile');
provider.addScope('email');

// Replit के AuthError इंटरफ़ेस को यहां परिभाषित करें
export interface AuthError {
  code: string;
  message: string;
  details?: string;
}

// Replit के AuthResult इंटरफ़ेस को यहां परिभाषित करें
export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}

// ✅ Replit से signInWithGoogle लॉजिक
// Sign in with Google using redirect flow with popup fallback
export const signInWithGoogle = async (usePopup: boolean = false): Promise<User | null> => {
  try {
    console.log(`Attempting Google sign-in using ${usePopup ? 'popup' : 'redirect'} flow...`);
    
    if (usePopup) {
      // Use popup for better compatibility with browsers blocking third-party storage
      console.log('Starting popup authentication...');
      const result = await signInWithPopup(auth, provider);
      console.log('Popup authentication successful:', result.user.email);
      return result.user;
    } else {
      // Use redirect flow
      console.log('Starting redirect authentication...');
      await signInWithRedirect(auth, provider);
      console.log('Redirect initiated, page will reload...');
      return null; // Redirect flow returns user after page reload
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // If redirect fails due to third-party storage blocking, fallback to popup
    if (error.code === 'auth/web-storage-unsupported' && !usePopup) {
      console.log('Storage unsupported, trying popup fallback...');
      return await signInWithGoogle(true); // खुद को रिकर्सिवली कॉल करें, popup के साथ
    }
    
    // Handle unauthorized domain error specifically
    if (error.code === 'auth/unauthorized-domain') {
      throw {
        code: error.code,
        message: 'This domain is not authorized for Google sign-in.',
        details: 'Please add this domain to Firebase Console → Authentication → Settings → Authorized domains. Current domain needs to be added to Firebase configuration.'
      } as AuthError;
    }
    
    throw {
      code: error.code || 'auth/signin-error',
      message: error.message || 'Failed to sign in with Google',
      details: `Error: ${error.toString()}. Check console for more details.`
    } as AuthError;
  }
};

// ✅ Replit से handleRedirectResult लॉजिक
// Handle redirect result after user returns from Google
export const handleRedirectResult = async (): Promise<AuthResult> => {
  try {
    const result = await getRedirectResult(auth);
    
    if (result) {
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Store the access token if needed
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      
      return { user, error: null };
    }
    
    return { user: null, error: null };
  } catch (error: any) {
    let authError: AuthError;
    
    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        authError = {
          code: error.code,
          message: 'An account already exists with the same email address but different sign-in credentials.',
          details: 'Please sign in using the original method you used to create this account.'
        };
        break;
      case 'auth/cancelled-popup-request':
        authError = {
          code: error.code,
          message: 'Sign-in was cancelled by the user.',
          details: 'The authentication process was interrupted.'
        };
        break;
      case 'auth/network-request-failed':
        authError = {
          code: error.code,
          message: 'Network error occurred during authentication.',
          details: 'Please check your internet connection and try again.'
        };
        break;
      case 'auth/web-storage-unsupported':
        authError = {
          code: error.code,
          message: 'Web storage is not supported or disabled.',
          details: 'This browser does not support or has disabled cookies/local storage required for authentication.'
        };
        break;
      default:
        authError = {
          code: error.code || 'auth/unknown-error',
          message: error.message || 'An unexpected error occurred during authentication.',
          details: 'Third-party storage access may be blocked by your browser. Please check your browser settings or try a different browser.'
        };
    }
    
    return { user: null, error: authError };
  }
};

// ✅ Replit से signOutUser लॉजिक (आपके मौजूदा logout को बदल देगा)
// Sign out the current user
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    sessionStorage.removeItem('google_access_token');
    console.log("Firebase: User signed out.");
  } catch (error: any) {
    console.error("Firebase signOut error:", error);
    throw {
      code: error.code || 'auth/signout-error',
      message: error.message || 'Failed to sign out',
      details: error.toString()
    } as AuthError;
  }
};

// ✅ Replit से onAuthStateChange लॉजिक (आपके useAuth हुक में उपयोग होगा)
// Listen to authentication state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ✅ Replit से checkBrowserCompatibility लॉजिक
// Check if third-party storage is likely blocked
export const checkBrowserCompatibility = (): { isCompatible: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let isCompatible = true;
  
  const userAgent = navigator.userAgent;
  const isChrome = userAgent.includes('Chrome');
  const isFirefox = userAgent.includes('Firefox');
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  
  // Check for browsers that might block third-party storage
  if (isChrome) {
    warnings.push('Chrome 115+ may block third-party storage access. Ensure cookies are enabled.');
  }
  if (isFirefox) {
    warnings.push('Firefox 109+ may block third-party storage access. Check privacy settings.');
  }
  if (isSafari) {
    warnings.push('Safari 16.1+ may block third-party storage access. Disable "Prevent cross-site tracking" for this site.');
  }
  
  // Check if cookies are enabled
  if (!navigator.cookieEnabled) {
    warnings.push('Cookies are disabled. Please enable cookies for authentication to work.');
    isCompatible = false;
  }
  
  return { isCompatible, warnings };
};

// पुराने export को नए से बदलें
export { app }; 
export { signOutUser as logout };
