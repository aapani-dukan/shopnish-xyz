// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQueryClient } from '@tanstack/react-query'; // `tanstack/react-query` को ठीक किया
import { 
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

// ... (SellerInfo, User, AuthContextType इंटरफेस और AuthContext अपरिवर्तित)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const queryClient = useQueryClient();

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // ✅ यह useEffect केवल Firebase auth state को मैनेज करेगा
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        await firebaseHandleRedirectResult();
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // ✅ अब हम Firebase auth state change पर सीधे backend login नहीं करेंगे
      // हम केवल क्लाइंट साइड Firebase यूजर को सेट करेंगे
      console.log("onAuthStateChanged triggered. fbUser:", fbUser ? fbUser.email : "null");

      if (fbUser) {
        // Firebase यूजर मौजूद है, लेकिन हम अभी तक backend से userData नहीं लाए हैं
        // idToken fetch करें लेकिन backend login API call को defer करें
        const idToken = await fbUser.getIdToken();
        const firebaseOnlyUser: User = { // केवल Firebase डेटा वाला यूजर ऑब्जेक्ट
          uid: fbUser.uid,
          email: fbUser.email || null,
          name: fbUser.displayName || null,
          role: user?.role || 'customer', // मौजूदा रोल रखें या डिफ़ॉल्ट 'customer'
          idToken: idToken,
          sellerProfile: user?.sellerProfile || null, // मौजूदा sellerProfile रखें
        };

        // यदि Firebase-only user डेटा बदल गया है तो स्टेट अपडेट करें
        if (JSON.stringify(user) !== JSON.stringify(firebaseOnlyUser)) {
          setUser(firebaseOnlyUser);
          setIsAuthenticated(true);
          // isAdmin को सेट करने के लिए हमें backend से रोल की आवश्यकता होगी
          // इसलिए इसे अब यहां सेट नहीं करेंगे या इसे केवल 'customer' के रूप में मानेंगे
          // या user?.role के आधार पर सेट करेंगे
          setIsAdmin(firebaseOnlyUser.role === 'admin'); 
          console.log("✅ Firebase user state updated.");
        } else {
          console.log("✅ Firebase user data unchanged, no state update needed.");
        }
      } else {
        console.log("❌ Firebase auth state changed: user is logged out.");
        if (isAuthenticated) {
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          queryClient.clear();
        }
      }
      setIsLoadingAuth(false); // Firebase auth state check खत्म हुआ
    });

    return () => unsubscribe();
  }, [queryClient, isAuthenticated, user]); // 'user' को यहां रखा गया है ताकि `firebaseOnlyUser.role` को सही तरीके से सेट किया जा सके

  const fetchBackendUserData = useCallback(async (fbUser: FirebaseUser) => {
    setIsLoadingAuth(true);
    try {
      const idToken = await fbUser.getIdToken();
      const res = await apiRequest("POST", `/api/users/login`, { idToken });
      const dbUserData = res.user;
      
      const newUserData: User = {
        uid: fbUser.uid,
        id: dbUserData?.id,
        email: fbUser.email || dbUserData?.email,
        name: fbUser.displayName || dbUserData?.name,
        role: dbUserData?.role || 'customer',
        idToken: idToken,
        sellerProfile: dbUserData?.sellerProfile || null,
      };
      
      if (JSON.stringify(user) !== JSON.stringify(newUserData)) {
        setUser(newUserData);
        setIsAuthenticated(true);
        setIsAdmin(newUserData.role === 'admin');
        console.log("✅ Backend user data fetched and state updated.");
      } else {
        console.log("✅ Backend user data unchanged, no state update needed.");
      }
    } catch (e: any) {
      console.error("❌ Failed to fetch backend user data:", e);
      setAuthError(e as AuthError);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      await signOutUser(); // यदि बैकएंड लॉगिन विफल रहता है तो Firebase से भी लॉगआउट करें
    } finally {
      setIsLoadingAuth(false);
    }
  }, [user]); // `user` को डिपेंडेंसी में जोड़ा

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      if (fbUser) {
        await fetchBackendUserData(fbUser); // ✅ लॉगिन के बाद backend data fetch करें
      }
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingAuth(false);
      throw err;
    }
  }, [fetchBackendUserData]); // `fetchBackendUserData` को डिपेंडेंसी में जोड़ा

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutUser();
      setAuthError(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      queryClient.clear();
    } catch (err: any) {
      setAuthError(err as AuthError);
      throw err;
    }
  }, [queryClient]);

  const refetchUser = useCallback(async () => {
    setIsLoadingAuth(true);
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fetchBackendUserData(fbUser); // ✅ refetchUser भी backend data fetch करने के लिए fetchBackendUserData का उपयोग करता है
    } else {
      setIsLoadingAuth(false);
    }
  }, [fetchBackendUserData]);

  const backendLogin = useCallback(async (email: string, password: string): Promise<User> => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      // यह backendLogin Firebase auth के बाहर एक पारंपरिक लॉगिन है (यदि लागू हो)
      // यदि यह Firebase auth के साथ जुड़ा हुआ है, तो आपको इसे signIn के समान ही उपयोग करना चाहिए।
      // इस उदाहरण में, मैं मान रहा हूँ कि यह सीधे आपके backend API को कॉल करता है
      const res = await apiRequest("POST", "/api/delivery/login", { email, password });
      const backendUser = res.user;

      if (!backendUser) {
        throw new Error("Invalid user data received from backend.");
      }

      const newUserData: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        sellerProfile: backendUser.sellerProfile || null,
      };

      if (JSON.stringify(user) !== JSON.stringify(newUserData)) {
        setUser(newUserData);
        setIsAuthenticated(true);
        setIsAdmin(newUserData.role === 'admin');
      } else {
        console.log("Backend login: User data unchanged, no state update needed.");
      }
      setIsLoadingAuth(false);

      return newUserData;

    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingAuth(false);
      throw err;
    }
  }, [user]);

  const authContextValue = useMemo(() => ({
    user,
    isLoadingAuth,
    isAuthenticated,
    isAdmin,
    error: authError,
    clearError,
    signIn,
    signOut,
    refetchUser,
    backendLogin, 
  }), [user, isLoadingAuth, isAuthenticated, isAdmin, authError, clearError, signIn, signOut, refetchUser, backendLogin]);

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
