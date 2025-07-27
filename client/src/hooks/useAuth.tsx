// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  auth, // आपको इस auth इंस्टेंस की आवश्यकता नहीं है यदि आप onAuthStateChanged सीधे आयात कर रहे हैं
  app,
  onAuthStateChanged, // ✅ onAuthStateChange से onAuthStateChanged में बदला
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
  AuthResult // AuthResult का उपयोग नहीं किया गया
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient"; 
import { queryClient } from '@/lib/queryClient'; // ✅ queryClient को इम्पोर्ट करें

// --- आपके प्रकारों को ठीक करें ---
// सुनिश्चित करें कि ये आपके types/index.ts से मेल खाते हैं या यहाँ सही हैं
interface SellerInfo { // यह अब SellerProfile होनी चाहिए, जैसा कि पहले चर्चा की गई थी
  id: string; // विक्रेता की ID
  userId: string; // Firebase UID से जुड़ा यूजर ID
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  // अन्य seller fields यहाँ जोड़ें
  [key: string]: any; // किसी भी अतिरिक्त फील्ड के लिए
}

interface User {
  uid: string; // Firebase UID
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery"; // भूमिका क्रमबद्ध करें
  // ✅ seller के बजाय sellerProfile का उपयोग करें, यह आपकी अपेक्षाओं से मेल खाता है
  sellerProfile?: SellerInfo | null; // यह वैकल्पिक हो सकता है
  idToken: string;
  // यदि आपके DB उपयोगकर्ता में ये हैं तो इन्हें यहाँ जोड़ें
  id?: string; // DB उपयोगकर्ता ID
  approvalStatus?: "pending" | "approved" | "rejected"; // DB उपयोगकर्ता की अनुमोदन स्थिति
}

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  clearError: () => void;
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // processAndSetUser अब DB से भी भूमिका और approvalStatus प्राप्त करेगा
  const processAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setError(null);
      setIsLoadingAuth(false);
      // Firebase उपयोगकर्ता नहीं होने पर सभी प्रासंगिक क्वेरीज़ को हटा दें
      queryClient.removeQueries({ queryKey: ["userProfile", firebaseUser?.uid] });
      queryClient.removeQueries({ queryKey: ["sellerProfile", firebaseUser?.uid] });
      queryClient.removeQueries({ queryKey: ["/api/users/me"] });
      queryClient.removeQueries({ queryKey: ["/api/sellers/me"] });
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      // कस्टम क्लेम से भूमिका प्राप्त करें (Firebase JWT में सेट किया गया)
      const decodedToken = await firebaseUser.getIdTokenResult();
      // सुनिश्चित करें कि भूमिका एक वैध UserRole है
      const firebaseRole: User['role'] = (decodedToken.claims.role as User['role']) || "customer";

      const email = firebaseUser.email;
      const name = firebaseUser.displayName;

      // 1. अपने DB से मुख्य उपयोगकर्ता डेटा (जिसमें DB रोल और approvalStatus है) प्राप्त करें
      let dbUserData: User | null = null;
      try {
        const res = await apiRequest("GET", `/api/users/me?firebaseUid=${firebaseUser.uid}`);
        const data = await res.json();
        dbUserData = data.user; // मान लें कि आपका /api/users/me { user: UserObject } लौटाता है
      } catch (apiError: any) {
        console.warn("DB User info fetch failed, using Firebase data:", apiError.message || apiError);
        // यदि DB user fetch विफल रहता है, तो Firebase data के साथ आगे बढ़ें
        // आप यहाँ एक एरर सेट कर सकते हैं यदि DB data महत्वपूर्ण है
        setError({ code: "db/user-fetch-failed", message: "Failed to fetch full user info from database." });
      }

      // 2. विक्रेता प्रोफ़ाइल डेटा फ़ेच करें (यदि लागू हो)
      let sellerProfileData: SellerInfo | null = null;
      // केवल तभी फ़ेच करें जब Firebase भूमिका 'seller' हो या DB भूमिका 'seller' हो
      if (firebaseRole === "seller" || dbUserData?.role === "seller") {
        try {
          // /api/sellers/me अब 404 पर एरर फेंकता है यदि कोई विक्रेता नहीं है
          const res = await apiRequest("GET", "/api/sellers/me", undefined); // idToken की अब यहाँ आवश्यकता नहीं है, apiRequest उसे अंदर हैंडल करता है
          sellerProfileData = await res.json() as SellerInfo;
          console.log("Seller info fetched:", sellerProfileData);
        } catch (apiError: any) {
          if (apiError.message && apiError.message.includes('404')) {
            console.log("Seller profile not found for user (404).");
            sellerProfileData = null; // यदि 404 है, तो कोई विक्रेता प्रोफ़ाइल नहीं है
          } else {
            console.warn("Seller profile fetch failed:", apiError.message || apiError);
            // गंभीर एरर के लिए एरर सेट करें
            setError({ code: "seller/profile-fetch-failed", message: "Failed to fetch seller profile." });
          }
        }
      }

      // अंतिम उपयोगकर्ता ऑब्जेक्ट बनाएं
      const finalRole: User['role'] = dbUserData?.role || firebaseRole; // DB भूमिका को प्राथमिकता दें
      const finalApprovalStatus = dbUserData?.approvalStatus || sellerProfileData?.approvalStatus || undefined; // DB approvalStatus को प्राथमिकता दें

      const currentUser: User = {
        uid: firebaseUser.uid,
        id: dbUserData?.id, // DB user ID
        email: email || dbUserData?.email,
        name: name || dbUserData?.name,
        role: finalRole,
        idToken: idToken,
        // ✅ sellerProfile यहाँ सेट किया गया है
        sellerProfile: sellerProfileData, 
        // यह सुनिश्चित करने के लिए कि 'approvalStatus' सीधे 'user' ऑब्जेक्ट में भी हो
        // यह उन कंपोनेंट्स के लिए उपयोगी हो सकता है जो सीधे 'user.approvalStatus' का उपयोग करते हैं
        approvalStatus: finalApprovalStatus, 
      };

      setUser(currentUser);
      setIsLoadingAuth(false);
      setError(null);
      console.log("User processed and set:", currentUser.uid, "Role:", currentUser.role, "Approval Status:", currentUser.approvalStatus);

    } catch (err: any) {
      console.error("Auth processing error:", err);
      setUser(null);
      setIsLoadingAuth(false);
      setError({ code: err.code || "auth/processing-error", message: err.message || "Failed to process user data." });
    }
  }, []);

  // रीडायरेक्ट परिणाम के लिए useEffect
  useEffect(() => {
    const checkRedirect = async () => {
      // यदि authState पहले से ही लोडिंग नहीं है या उपयोगकर्ता सेट है, तो अनावश्यक रूप से फिर से जाँच न करें
      if (!isLoadingAuth && user) return; 

      console.log("🔄 Checking for redirect result...");
      const { user: fbUser, error: redirectError } = await firebaseHandleRedirectResult();
      
      if (fbUser) {
        console.log("✅ Redirect result user found:", fbUser.uid);
        await processAndSetUser(fbUser);
      } else if (redirectError) {
        console.log("❌ Redirect error found:", redirectError);
        setError(redirectError);
        setIsLoadingAuth(false);
      } else {
        console.log("ℹ️ No redirect result user or error. Waiting for onAuthStateChanged.");
      }
    };
    checkRedirect();
  }, [isLoadingAuth, user, processAndSetUser]); // ✅ निर्भरताएँ अपडेट की गईं

  // onAuthStateChanged listener
  useEffect(() => {
    console.log("🔄 Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => { // ✅ onAuthStateChange को onAuthStateChanged में बदल दिया गया
      console.log("🔄 onAuthStateChanged listener fired. fbUser:", fbUser?.uid || "null");
      // केवल तभी processAndSetUser को कॉल करें यदि user state अभी भी null है
      // या यदि fbUser बदल गया है (ताकि अनावश्यक अपडेट से बचा जा सके)
      if (!user || (fbUser && fbUser.uid !== user.uid) || (!fbUser && user)) {
        await processAndSetUser(fbUser);
      } else {
        setIsLoadingAuth(false); // यदि कोई बदलाव नहीं है, तो लोडिंग खत्म करें
      }
    });

    return () => {
      console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [user, processAndSetUser]); // ✅ user को निर्भरता में जोड़ा गया

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      // processAndSetUser को पहले ही onAuthStateChanged द्वारा हैंडल किया जाएगा
      // तो यहाँ सीधे fbUser लौटा दें
      return fbUser; 
    } catch (err: any) {
      console.error("Auth Provider: Error during signIn:", err);
      setError(err as AuthError);
      setUser(null);
      setIsLoadingAuth(false);
      throw err;
    }
  }, []); // ✅ निर्भरताएँ हटाई गईं क्योंकि processAndSetUser अब onAuthStateChanged में है

  const signOut = useCallback(async () => {
    try {
      console.log("Auth Provider: Attempting to sign out...");
      await signOutUser();
      // setUser(null) और setIsLoadingAuth(false) को processAndSetUser द्वारा हैंडल किया जाएगा
      // जब onAuthStateChanged null fbUser के साथ फायर करेगा
      setError(null);
      console.log("✅ Signed out successfully. State reset.");
      // लॉगआउट पर सभी क्वेरी कैश को साफ करें
      queryClient.clear();
    } catch (err: any) {
      console.error("❌ Error during sign out:", err);
      setError(err as AuthError);
      throw err;
    }
  }, []); // ✅ निर्भरताएँ हटाई गईं

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const authContextValue = {
    user,
    isLoadingAuth,
    isAuthenticated: !!user,
    error,
    clearError,
    signIn,
    signOut,
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
