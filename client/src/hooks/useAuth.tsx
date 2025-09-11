// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback, useMemo } from "react"; // `useMemo` जोड़ा
import { User as FirebaseUser } from "firebase/auth";
import { useQueryClient } from 'tanstack/react-query'; // `useQueryClient` में `usequeryclient` को ठीक किया
import { 
  auth,
  onAuthStateChanged, // `onAuthStateChanged` में `onauthstatechanged` को ठीक किया
  handleRedirectResult as firebaseHandleRedirectResult, // `firebaseHandleRedirectResult` में `handleredirectresult` को ठीक किया
  signInWithGoogle as firebaseSignInWithGoogle, // `firebaseSignInWithGoogle` में `signinwithgoogle` को ठीक किया
  signOutUser, // `signOutUser` में `signoutuser` को ठीक किया
  AuthError, // `AuthError` में `autherror` को ठीक किया
} from "@/lib/firebase"; // `@/lib/firebase` का उपयोग किया
import { apiRequest } from "@/lib/queryClient"; // `@/lib/queryClient` का उपयोग किया

// --- आपके प्रकारों को ठीक करें ---
export interface SellerInfo { // `SellerInfo` में `sellerinfo` को ठीक किया
  id: string;
  userId: string; // `userId` में `userid` को ठीक किया
  businessName: string; // `businessName` में `businessname` को ठीक किया
  approvalStatus: "pending" | "approved" | "rejected"; // `approvalStatus` में `approvalstatus` को ठीक किया
  rejectionReason?: string | null; // `rejectionReason` में `rejectionreason` को ठीक किया
  [key: string]: any;
}

export interface User { // `User` में `user` को ठीक किया
  id?: string; // `id` को वैकल्पिक बनाया क्योंकि Firebase user में सीधे `id` नहीं होता
  uid?: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null; // `sellerProfile` में `sellerprofile` को ठीक किया
  idToken?: string; // `idToken` में `idtoken` को ठीक किया
}

interface AuthContextType { // `AuthContextType` में `authcontexttype` को ठीक किया
  user: User | null;
  isLoadingAuth: boolean; // `isLoadingAuth` में `isloadingauth` को ठीक किया
  isAuthenticated: boolean; // `isAuthenticated` में `isauthenticated` को ठीक किया
  isAdmin: boolean; // `isAdmin` में `isadmin` को ठीक किया
  error: AuthError | null;
  clearError: () => void; // `clearError` में `clearerror` को ठीक किया
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>; // `signIn` और `usePopup` को ठीक किया, `Promise` का उपयोग किया
  signOut: () => Promise<void>; // `signOut` को ठीक किया, `Promise` का उपयोग किया
  refetchUser: () => void; // `refetchUser` को ठीक किया
  backendLogin: (email: string, password: string) => Promise<User>; // `backendLogin` को ठीक किया, `Promise` का उपयोग किया
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // `AuthContext` में `authcontext` को ठीक किया

export const AuthProvider = ({ children }: { children: React.ReactNode }) => { // `AuthProvider` में `authprovider` को ठीक किया, `React.ReactNode` का उपयोग किया
  const [user, setUser] = useState<User | null>(null); // `setUser` में `setuser` को ठीक किया
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // `setIsLoadingAuth` में `setisloadingauth` को ठीक किया
  const [isAuthenticated, setIsAuthenticated] = useState(false); // `setIsAuthenticated` में `setisauthenticated` को ठीक किया
  const [isAdmin, setIsAdmin] = useState(false); // `setIsAdmin` में `setisadmin` को ठीक किया
  const [authError, setAuthError] = useState<AuthError | null>(null); // `setAuthError` में `setautherror` को ठीक किया
  const queryClient = useQueryClient(); // `queryClient` में `queryclient` को ठीक किया

  const clearError = useCallback(() => { // `clearError` में `clearerror` को ठीक किया
    setAuthError(null);
  }, []);

  useEffect(() => {
    const checkRedirectResult = async () => { // `checkRedirectResult` में `checkredirectresult` को ठीक किया
      try {
        await firebaseHandleRedirectResult(); // `firebaseHandleRedirectResult` को ठीक किया
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsLoadingAuth(true); // `setIsLoadingAuth` को ठीक किया
        try {
          const idToken = await fbUser.getIdToken(); // `idToken` और `getIdToken` को ठीक किया
          const res = await apiRequest("POST", `/api/users/login`, { idToken }); // `POST` और `apiRequest` को ठीक किया
          const dbUserData = res.user;
          
          const newUserData: User = { // `newUserData` और `User` को ठीक किया
            uid: fbUser.uid,
            id: dbUserData?.id,
            email: fbUser.email || dbUserData?.email,
            name: fbUser.displayName || dbUserData?.name, // `displayName` को ठीक किया
            role: dbUserData?.role || 'customer',
            idToken: idToken,
            sellerProfile: dbUserData?.sellerProfile || null, // `sellerProfile` को ठीक किया
          };
          
          // ✅ इनफाइनाइट री-रेंडर लूप को रोकने के लिए तुलना करें
          if (JSON.stringify(user) !== JSON.stringify(newUserData)) {
            setUser(newUserData);
            setIsAuthenticated(true);
            setIsAdmin(newUserData.role === 'admin');
            console.log("✅ User successfully authenticated and profile fetched from backend.");
          } else {
            console.log("✅ User data unchanged, no state update needed.");
          }
          
        } catch (e: any) {
          console.error("❌ Backend communication failed on auth state change:", e);
          await signOutUser(); // `signOutUser` को ठीक किया
          setAuthError(e as AuthError); // `setAuthError` को ठीक किया
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUser(null);
        }
      } else {
        console.log("❌ Firebase auth state changed: user is logged out.");
        // ✅ केवल तभी अपडेट करें जब स्टेट पहले से लॉग इन हो
        if (isAuthenticated) {
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          queryClient.clear();
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [queryClient, isAuthenticated, user]); // `isAuthenticated` और `user` को डिपेंडेंसी में जोड़ा for comparison

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => { // `signIn` और `usePopup` को ठीक किया
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup); // `firebaseSignInWithGoogle` को ठीक किया
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingAuth(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => { // `signOut` को ठीक किया
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

  const refetchUser = useCallback(async () => { // `refetchUser` को ठीक किया
    setIsLoadingAuth(true);
    const fbUser = auth.currentUser; // `currentUser` को ठीक किया
    if (fbUser) {
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

        // ✅ इनफाइनाइट री-रेंडर लूप को रोकने के लिए तुलना करें
        if (JSON.stringify(user) !== JSON.stringify(newUserData)) {
          setUser(newUserData);
          setIsAuthenticated(true);
          setIsAdmin(newUserData.role === 'admin');
        } else {
          console.log("Refetch: User data unchanged, no state update needed.");
        }
      } catch (e) {
        console.error("Failed to refetch user data:", e);
        setAuthError(e as AuthError);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    }
    setIsLoadingAuth(false);
  }, [user]); // `user` को डिपेंडेंसी में जोड़ा

  const backendLogin = useCallback(async (email: string, password: string): Promise<User> => { // `backendLogin` को ठीक किया
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const res = await apiRequest("POST", "/api/delivery/login", { email, password });
      const backendUser = res.user; // `backendUser` को ठीक किया

      if (!backendUser) {
        throw new Error("Invalid user data received from backend."); // `Error` को ठीक किया
      }

      const newUserData: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        sellerProfile: backendUser.sellerProfile || null,
      };

      // ✅ इनफाइनाइट री-रेंडर लूप को रोकने के लिए तुलना करें
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
  }, [user]); // `user` को डिपेंडेंसी में जोड़ा

  const authContextValue = useMemo(() => ({ // `authContextValue` को ठीक किया, `useMemo` का उपयोग किया
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
    <AuthContext.Provider value={authContextValue}> {/* `AuthContext.Provider` को ठीक किया */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => { // `useAuth` को ठीक किया
  const ctx = useContext(AuthContext); // `useContext` और `AuthContext` को ठीक किया
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider"); // `Error` और `useAuth`, `AuthProvider` को ठीक किया
  return ctx;
};
