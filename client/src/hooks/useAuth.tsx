// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth"; // FirebaseUser को सीधा इम्पोर्ट करें
import { 
  auth, // Firebase Auth instance
  app, // Firebase app instance
  onAuthStateChange, // Replit वाला onAuthStateChange लिसनर
  handleRedirectResult as firebaseHandleRedirectResult, // Replit वाला handleRedirectResult
  signInWithGoogle as firebaseSignInWithGoogle, // Replit वाला signInWithGoogle (popup/redirect)
  signOutUser, // Replit वाला signOutUser
  AuthError, // Replit से AuthError टाइप
  AuthResult // Replit से AuthResult टाइप
} from "@/lib/firebase"; // ✅ अब firebase.ts से सभी आवश्यक फ़ंक्शन और टाइप्स इम्पोर्ट करें

// यदि आपके पास QueryClient से apiRequest है, तो सुनिश्चित करें कि यह सही ढंग से इम्पोर्ट हो
// यदि apiRequest 'Authorization' हेडर में 'idToken' लेता है, तो उसे अपडेट करने की आवश्यकता होगी।
// मान लेते हैं कि apiRequest को अब सीधे idToken पास किया जा सकता है जैसा कि आपके पुराने कोड में था।
import { apiRequest } from "@/lib/queryClient"; 

interface SellerInfo {
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
}

interface User {
  uid: string; // Firebase UID
  email: string | null;
  name: string | null;
  role: "seller" | "admin" | "delivery" | "customer";
  seller?: SellerInfo;
  idToken: string; // Firebase ID Token
  // firebaseUid: string; // uid ही Firebase UID है, duplicate की ज़रूरत नहीं
}

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  error: AuthError | null; // ✅ एरर स्टेट जोड़ें
  clearError: () => void; // ✅ एरर क्लियर करने के लिए
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>; // ✅ signIn फ़ंक्शन जोड़ें
  signOut: () => Promise<void>; // ✅ signOut अब Promise<void> रिटर्न करेगा
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<AuthError | null>(null); // ✅ एरर स्टेट

  // Function to process the Firebase user object and fetch custom claims/roles
  const processAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setError(null); // यदि कोई उपयोगकर्ता नहीं है तो एरर क्लियर करें
      setIsLoadingAuth(false);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const decodedToken = await firebaseUser.getIdTokenResult();

      const role = decodedToken.claims.role || "customer";
      const email = firebaseUser.email;
      const name = firebaseUser.displayName;

      let seller: SellerInfo | undefined = undefined;
      if (role === "seller") {
        try {
          // Backend से seller info fetch करें
          // apiRequest में idToken को Authorization Header के रूप में पास करें
          const res = await apiRequest("GET", "/api/sellers/me", undefined, idToken);
          const responseData = await res.json(); // Response को JSON में पार्स करें
          seller = responseData as SellerInfo; // इसे SellerInfo के रूप में कास्ट करें
          console.log("Seller info fetched:", seller);
        } catch (apiError) {
          console.warn("Seller info fetch failed:", apiError);
          // यदि API कॉल विफल रहता है, तो भी उपयोगकर्ता को सेट करें लेकिन विक्रेता जानकारी के बिना
          setError({ code: "seller/info-fetch-failed", message: "Failed to fetch seller info." });
        }
      }

      setUser({ uid: firebaseUser.uid, email, name, role, seller, idToken });
      setIsLoadingAuth(false);
      setError(null); // सक्सेसफुल लॉगिन पर एरर क्लियर करें
      console.log("User processed and set:", firebaseUser.uid, "Role:", role);

    } catch (err: any) {
      console.error("Auth processing error:", err);
      setUser(null);
      setIsLoadingAuth(false);
      setError({ code: err.code || "auth/processing-error", message: err.message || "Failed to process user data." });
    }
  }, []); // useCallback dependencies


  // useEffect 1: Handle Google Redirect Result (on page load after redirect)
  useEffect(() => {
    console.log("🔄 Checking for redirect result...");
    const checkRedirect = async () => {
      // ✅ Replit के handleRedirectResult का उपयोग करें
      const { user: fbUser, error: redirectError } = await firebaseHandleRedirectResult();
      
      if (fbUser) {
        console.log("✅ Redirect result user found:", fbUser.uid);
        await processAndSetUser(fbUser);
      } else if (redirectError) {
        console.log("❌ Redirect error found:", redirectError);
        setError(redirectError);
        setIsLoadingAuth(false); // त्रुटि पर भी लोडिंग समाप्त करें
      } else {
        console.log("ℹ️ No redirect result user or error.");
        // यदि कोई रीडायरेक्ट परिणाम नहीं है, तो onAuthStateChanged को अपनी बारी का इंतज़ार करने दें।
        // setIsLoadingAuth को यहां false नहीं करेंगे, onAuthStateChanged संभालेगा।
      }
    };

    // यह सुनिश्चित करने के लिए कि यह केवल एक बार चले और onAuthStateChanged से पहले
    // हम एक छोटे से टाइमर का उपयोग कर सकते हैं या `sessionStorage` में एक फ़्लैग सेट कर सकते हैं।
    // सरलतम मामले के लिए, इसे सीधे चलाएँ।
    checkRedirect();
  }, [processAndSetUser]);


  // useEffect 2: Set up the onAuthStateChanged listener
  useEffect(() => {
    console.log("🔄 Setting up onAuthStateChanged listener.");
    // ✅ Replit के onAuthStateChange का उपयोग करें
    const unsubscribe = onAuthStateChange(async (fbUser) => {
      console.log("🔄 onAuthStateChanged listener fired. fbUser:", fbUser?.uid || "null");
      // isLoadingAuth को यहाँ `true` सेट करें यदि यह पहली बार ट्रिगर हो रहा है और हम अभी भी लोड कर रहे हैं।
      // यह सुनिश्चित करता है कि UI को 'लोडिंग' स्थिति पता चले।
      if (isLoadingAuth && !fbUser && user === null) {
          // यदि पहली बार लोड हो रहा है और कोई उपयोगकर्ता नहीं है, तो यह अंतिम स्थिति है
          setIsLoadingAuth(false);
      }
      await processAndSetUser(fbUser); // Firebase उपयोगकर्ता को प्रोसेस करें
    });

    return () => {
      console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [processAndSetUser, isLoadingAuth, user]); // dependencies में user और isLoadingAuth जोड़ें


  // ✅ Google के साथ साइन-इन (पॉपअप/रीडायरेक्ट)
  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setError(null); // नए साइन-इन प्रयास से पहले कोई भी पुरानी एरर क्लियर करें
    try {
      // ✅ Replit के signInWithGoogle फ़ंक्शन का उपयोग करें
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      if (fbUser) {
        await processAndSetUser(fbUser); // यदि पॉपअप सफल होता है, तो तुरंत प्रोसेस करें
      }
      // यदि रीडायरेक्ट होता है, तो फ़ंक्शन null लौटाएगा, और रीडायरेक्ट परिणाम useEffect इसे संभालेगा
      return fbUser; 
    } catch (err: any) {
      console.error("Auth Provider: Error during signIn:", err);
      // firebaseSignInWithGoogle पहले से ही AuthError के रूप में एरर फेंक रहा है।
      setError(err as AuthError);
      setUser(null);
      setIsLoadingAuth(false);
      throw err; // एरर को कॉलिंग कंपोनेंट तक पहुंचाएं
    }
  }, [processAndSetUser]);


  // ✅ लॉग-आउट फ़ंक्शन
  const signOut = useCallback(async () => {
    try {
      console.log("Auth Provider: Attempting to sign out...");
      await signOutUser(); // ✅ Replit के signOutUser फ़ंक्शन का उपयोग करें
      setUser(null);
      // setIsAuthenticated(false); // isAuthenticated computed property है
      setIsLoadingAuth(false); // साइन आउट के बाद लोडिंग समाप्त
      setError(null); // साइन आउट पर एरर क्लियर करें
      console.log("✅ Signed out successfully. State reset.");
    } catch (err: any) {
      console.error("❌ Error during sign out:", err);
      setError(err as AuthError);
      throw err; // एरर को कॉलिंग कंपोनेंट तक पहुंचाएं
    }
  }, []);

  // ✅ एरर क्लियर करने के लिए फ़ंक्शन
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const authContextValue = {
    user,
    isLoadingAuth,
    isAuthenticated: !!user, // यह एक गणना की गई प्रॉपर्टी है
    error, // ✅ एरर को एक्सपोज करें
    clearError, // ✅ clearError को एक्सपोज करें
    signIn, // ✅ signIn को एक्सपोज करें
    signOut, // ✅ signOut को एक्सपोज करें
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
