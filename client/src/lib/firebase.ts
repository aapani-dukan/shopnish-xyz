// client/src/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import {
getAuth,
GoogleAuthProvider,
signInWithRedirect,
signInWithPopup,
getRedirectResult,
signOut,
onAuthStateChanged,
User,
} from "firebase/auth";

// ✅ Firebase config को सीधे hard-code करें
const firebaseConfig = {
apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
authDomain: "aapani-dukan.firebaseapp.com",
projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.addScope('profile');
provider.addScope('email');

export interface AuthError {
code: string;
message: string;
details?: string;
}

export interface AuthResult {
user: User | null;
error: AuthError | null;
}

export const signInWithGoogle = async (usePopup: boolean = false): 
  Promise<User | null> => {
try {
console.log('Attempting Google sign-in
  using${usePopup ? 
  "popup": "redirect"} flow...');

if (usePopup) {  
  console.log('Starting popup authentication...');  
  const result = await signInWithPopup(auth, provider);  
  console.log('Popup authentication successful:', result.user.email);  
  return result.user;  
} else {  
  console.log('Starting redirect authentication...');  
  await signInWithRedirect(auth, provider);  
  console.log('Redirect initiated, page will reload...');  
  return null;  
}

} catch (error: any) {
console.error('Authentication error:', error);

if (error.code === 'auth/web-storage-unsupported' && !usePopup) {  
  console.log('Storage unsupported, trying popup fallback...');  
  return await signInWithGoogle(true);  
}  
  
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

export const handleRedirectResult = async (): Promise<AuthResult> => {
try {
const result = await getRedirectResult(auth);

if (result) {  
  const user = result.user;  
  const credential = GoogleAuthProvider.credentialFromResult(result);  
    
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

export { onAuthStateChanged };

export const onAuthStateChange = (callback: (user: User | null) => void) => {
return onAuthStateChanged(auth, callback);
};

export const checkBrowserCompatibility = (): { isCompatible: boolean; warnings: string[] } => {
const warnings: string[] = [];
let isCompatible = true;

const userAgent = navigator.userAgent;
const isChrome = userAgent.includes('Chrome');
const isFirefox = userAgent.includes('Firefox');
const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');

if (isChrome) {
warnings.push('Chrome 115+ may block third-party storage access. Ensure cookies are enabled.');
}
if (isFirefox) {
warnings.push('Firefox 109+ may block third-party storage access. Check privacy settings.');
}
if (isSafari) {
warnings.push('Safari 16.1+ may block third-party storage access. Disable "Prevent cross-site tracking" for this site.');
}

if (!navigator.cookieEnabled) {
warnings.push('Cookies are disabled. Please enable cookies for authentication to work.');
isCompatible = false;
}

return { isCompatible, warnings };
};

export { app };
export { signOutUser as logout };
export const signInWithGooglePopup = () => signInWithGoogle(true);
