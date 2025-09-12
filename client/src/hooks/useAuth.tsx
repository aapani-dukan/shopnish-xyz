// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback, useMemo } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQueryClient } from '@tanstack/react-query'; // ✅ ठीक किया गया इम्पोर्ट
import { 
  auth,
  onAuthStateChanged, // ✅ ठीक किया गया नामकरण
  handleRedirectResult as firebaseHandleRedirectResult, // ✅ ठीक किया गया नामकरण
  signInWithGoogle as firebaseSignInWithGoogle, // ✅ ठीक किया गया नामकरण
  signOutUser, // ✅ ठीक किया गया नामकरण
  AuthError, // ✅ ठीक किया गया नामकरण
} from "@/lib/firebase"; // ✅ ठीक किया गया इम्पोर्ट पाथ (assuming @/ is correctly configured)
import { apiRequest } from "@/lib/queryClient"; // ✅ ठीक किया गया इम्पोर्ट पाथ

// --- आपके प्रकारों को ठीक करें ---
export interface SellerInfo { // ✅ ठीक किया गया नामकरण
  id: string;
  userId: string; // ✅ ठीक किया गया नामकरण
  businessName: string; // ✅ ठीक किया गया नामकरण
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null; // ✅ ठीक किया गया नामकरण
  [key: string]: any;
}

export interface User { // ✅ ठीक किया गया नामकरण
  id?: string;
  uid?: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null; // ✅ ठीक किया गया नामकरण
  idToken?: string; // ✅ ठीक किया गया नामकरण
}

interface AuthContextType { // ✅ ठीक किया गया नामकरण
  user: User | null;
  isLoadingAuth: boolean; // ✅ ठीक किया गया नामकरण
  isAuthenticated: boolean; // ✅ ठीक किया गया नामकरण
  isAdmin: boolean; // ✅ ठीक किया गया नामकरण
  error: AuthError | null;
  clearError: () => void; // ✅ ठीक किया गया नामकरण
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>; // ✅ ठीक किया गया नामकरण और `Promise`
  signOut: () => Promise<void>; // ✅ ठीक किया गया नामकरण और `Promise`
  refetchUser: () => void; // ✅ ठीक किया गया नामकरण
  backendLogin: (email: string, password: string) => Promise<User>; // ✅ ठीक किया गया नामकरण और `Promise`
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // ✅ ठीक किया गया नामकरण

export const AuthProvider = ({ children }: { children: React.ReactNode }) => { // ✅ ठीक किया गया नामकरण
  const [user, setUser] = useState<User | null>(null); // ✅ ठीक किया गया नामकरण
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // ✅ ठीक किया गया नामकरण
  const [isAuthenticated, setIsAuthenticated] = useState(false); // ✅ ठीक किया गया नामकरण
  const [isAdmin, setIsAdmin] = useState(false); // ✅ ठीक किया गया नामकरण
  const [authError, setAuthError] = useState<AuthError | null>(null); // ✅ ठीक किया गया नामकरण
  const queryClient = useQueryClient(); // ✅ ठीक किया गया नामकरण

  const clearError = useCallback(() => { // ✅ ठीक किया गया नामकरण
    setAuthError(null);
  }, []);

  // ✅ यह useEffect केवल Firebase auth state को मैनेज करेगा
  useEffect(() => { // ✅ ठीक किया गया नामकरण
    const checkRedirectResult = async () => { // ✅ ठीक किया गया नामकरण
      try {
        await firebaseHandleRedirectResult(); // ✅ ठीक किया गया नामकरण
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => { // ✅ ठीक किया गया नामकरण
      console.log("onAuthStateChanged triggered. fbUser:", fbUser ? fbUser.email : "null");

      if (fbUser) {
        const idToken = await fbUser.getIdToken(); // ✅ ठीक किया गया नामकरण
        const firebaseOnlyUser: User = { // ✅ ठीक किया गया नामकरण
          uid: fbUser.uid,
          email: fbUser.email || null,
          name: fbUser.displayName || null, // ✅ ठीक किया गया नामकरण
          role: user?.role || 'customer',
          idToken: idToken, // ✅ ठीक किया गया नामकरण
          sellerProfile: user?.sellerProfile || null, // ✅ ठीक किया गया नामकरण
        };

        if (JSON.stringify(user) !== JSON.stringify(firebaseOnlyUser)) { // ✅ ठीक किया गया `JSON.stringify`
          setUser(firebaseOnlyUser); // ✅ ठीक किया गया नामकरण
          setIsAuthenticated(true); // ✅ ठीक किया गया नामकरण
          setIsAdmin(firebaseOnlyUser.role === 'admin'); // ✅ ठीक किया गया नामकरण
          console.log("✅ Firebase user state updated.");
        } else {
          console.log("✅ Firebase user data unchanged, no state update needed.");
        }
      } else {
        console.log("❌ Firebase auth state changed: user is logged out.");
        if (isAuthenticated) {
          setUser(null); // ✅ ठीक किया गया नामकरण
          setIsAuthenticated(false); // ✅ ठीक किया गया नामकरण
          setIsAdmin(false); // ✅ ठीक किया गया नामकरण
          queryClient.clear(); // ✅ ठीक किया गया नामकरण
        }
      }
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण
    });

    return () => unsubscribe();
  }, [queryClient, isAuthenticated, user]);

  const fetchBackendUserData = useCallback(async (fbUser: FirebaseUser) => { // ✅ ठीक किया गया नामकरण
    setIsLoadingAuth(true); // ✅ ठीक किया गया नामकरण
    try {
      const idToken = await fbUser.getIdToken(); // ✅ ठीक किया गया नामकरण
      const res = await apiRequest("POST", `/api/users/login`, { idToken });
      const dbUserData = res.user; // ✅ ठीक किया गया नामकरण
      
      const newUserData: User = { // ✅ ठीक किया गया नामकरण
        uid: fbUser.uid,
        id: dbUserData?.id,
        email: fbUser.email || dbUserData?.email,
        name: fbUser.displayName || dbUserData?.name, // ✅ ठीक किया गया नामकरण
        role: dbUserData?.role || 'customer',
        idToken: idToken, // ✅ ठीक किया गया नामकरण
        sellerProfile: dbUserData?.sellerProfile || null, // ✅ ठीक किया गया नामकरण
      };
      
      if (JSON.stringify(user) !== JSON.stringify(newUserData)) { // ✅ ठीक किया गया `JSON.stringify`
        setUser(newUserData); // ✅ ठीक किया गया नामकरण
        setIsAuthenticated(true); // ✅ ठीक किया गया नामकरण
        setIsAdmin(newUserData.role === 'admin'); // ✅ ठीक किया गया नामकरण
        console.log("✅ Backend user data fetched and state updated.");
      } else {
        console.log("✅ Backend user data unchanged, no state update needed.");
      }
    } catch (e: any) {
      console.error("❌ Failed to fetch backend user data:", e);
      setAuthError(e as AuthError); // ✅ ठीक किया गया नामकरण
      setIsAuthenticated(false); // ✅ ठीक किया गया नामकरण
      setIsAdmin(false); // ✅ ठीक किया गया नामकरण
      setUser(null); // ✅ ठीक किया गया नामकरण
      await signOutUser(); // ✅ ठीक किया गया नामकरण
    } finally {
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण
    }
  }, [user]);

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => { // ✅ ठीक किया गया नामकरण और `Promise`
    setIsLoadingAuth(true); // ✅ ठीक किया गया नामकरण
    setAuthError(null); // ✅ ठीक किया गया नामकरण
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup); // ✅ ठीक किया गया नामकरण
      if (fbUser) {
        await fetchBackendUserData(fbUser);
      }
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError); // ✅ ठीक किया गया नामकरण
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण
      throw err;
    }
  }, [fetchBackendUserData]);

  const signOut = useCallback(async (): Promise<void> => { // ✅ ठीक किया गया नामकरण और `Promise`
    try {
      await signOutUser(); // ✅ ठीक किया गया नामकरण
      setAuthError(null); // ✅ ठीक किया गया नामकरण
      setUser(null); // ✅ ठीक किया गया नामकरण
      setIsAuthenticated(false); // ✅ ठीक किया गया नामकरण
      setIsAdmin(false); // ✅ ठीक किया गया नामकरण
      queryClient.clear(); // ✅ ठीक किया गया नामकरण
    } catch (err: any) {
      setAuthError(err as AuthError); // ✅ ठीक किया गया नामकरण
      throw err;
    }
  }, [queryClient]);

  const refetchUser = useCallback(async () => { // ✅ ठीक किया गया नामकरण
    setIsLoadingAuth(true); // ✅ ठीक किया गया नामकरण
    const fbUser = auth.currentUser; // ✅ ठीक किया गया नामकरण
    if (fbUser) {
      await fetchBackendUserData(fbUser);
    } else {
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण
    }
  }, [fetchBackendUserData]);

  const backendLogin = useCallback(async (email: string, password: string): Promise<User> => { // ✅ ठीक किया गया नामकरण और `Promise`
    setAuthError(null); // ✅ ठीक किया गया नामकरण
    setIsLoadingAuth(true); // ✅ ठीक किया गया नामकरण
    try {
      const res = await apiRequest("POST", "/api/delivery/login", { email, password });
      const backendUser = res.user; // ✅ ठीक किया गया नामकरण

      if (!backendUser) {
        throw new Error("Invalid user data received from backend."); // ✅ ठीक किया गया `Error`
      }

      const newUserData: User = { // ✅ ठीक किया गया नामकरण
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        sellerProfile: backendUser.sellerProfile || null, // ✅ ठीक किया गया नामकरण
      };

      if (JSON.stringify(user) !== JSON.stringify(newUserData)) { // ✅ ठीक किया गया `JSON.stringify`
        setUser(newUserData); // ✅ ठीक किया गया नामकरण
        setIsAuthenticated(true); // ✅ ठीक किया गया नामकरण
        setIsAdmin(newUserData.role === 'admin'); // ✅ ठीक किया गया नामकरण
      } else {
        console.log("Backend login: User data unchanged, no state update needed.");
      }
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण

      return newUserData;

    } catch (err: any) {
      setAuthError(err as AuthError); // ✅ ठीक किया गया नामकरण
      setIsLoadingAuth(false); // ✅ ठीक किया गया नामकरण
      throw err;
    }
  }, [user]);

  const authContextValue = useMemo(() => ({ // ✅ ठीक किया गया नामकरण
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
    <AuthContext.Provider value={authContextValue}> {/* ✅ ठीक किया गया नामकरण */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => { // ✅ ठीक किया गया नामकरण
  const ctx = useContext(AuthContext); // ✅ ठीक किया गया नामकरण
  if (!ctx) throw new Error("useAuth must be used within an an AuthProvider"); // ✅ ठीक किया गया नामकरण
  return ctx;
};
