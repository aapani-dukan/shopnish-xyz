// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQueryClient } from '@tanstack/react-query';
import { 
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

// --- आपके प्रकारों को ठीक करें ---
export interface SellerInfo {
  id: string;
  userId: string;
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  [key: string]: any;
}

export interface User {
  id: string;
  uid: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null;
  idToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  clearError: () => void;
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const queryClient = useQueryClient();

  // ✅ `clearError` को यहाँ ठीक से परिभाषित किया गया है
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

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
      if (fbUser) {
        try {
          console.log("✅ Firebase auth state changed. Attempting backend login...");
          const idToken = await fbUser.getIdToken();

          const res = await apiRequest("POST", `/api/auth/login`, { idToken });
          const dbUserData = res.user; 
          
          const currentUser: User = {
            uid: fbUser.uid,
            id: dbUserData?.id,
            email: fbUser.email || dbUserData?.email,
            name: fbUser.displayName || dbUserData?.name,
            role: dbUserData?.role || 'customer',
            idToken: idToken,
            sellerProfile: dbUserData?.sellerProfile || null,
          };
          
          setUser(currentUser);
          setIsAuthenticated(true);
          console.log("✅ User successfully authenticated and profile fetched from backend.");
          
        } catch (e: any) {
          console.error("❌ Backend communication failed on auth state change:", e);
          await auth.signOut();
          setAuthError(e as AuthError);
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        console.log("❌ Firebase auth state changed: User is logged out.");
        setUser(null);
        setIsAuthenticated(false);
        queryClient.clear();
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [queryClient]);

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingAuth(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setAuthError(null);
      setUser(null);
      setIsAuthenticated(false);
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
      try {
        const idToken = await fbUser.getIdToken();
        const res = await apiRequest("POST", `/api/auth/login`, { idToken });
        const dbUserData = res.user;
        
        const currentUser: User = {
          uid: fbUser.uid,
          id: dbUserData?.id,
          email: fbUser.email || dbUserData?.email,
          name: fbUser.displayName || dbUserData?.name,
          role: dbUserData?.role || 'customer',
          idToken: idToken,
          sellerProfile: dbUserData?.sellerProfile || null,
        };
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to refetch user data:", e);
        setAuthError(e as AuthError);
        setIsAuthenticated(false);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  const authContextValue = {
    user,
    isLoadingAuth,
    isAuthenticated,
    error: authError,
    // ✅ इसे यहां जोड़ा गया है
    clearError,
    signIn,
    signOut,
    refetchUser,
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
