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
  uid?: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null;
  idToken?: string;
}

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: AuthError | null;
  clearError: () => void;
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  refetchUser: () => void;
  // ✅ नया फ़ंक्शन: backend से प्राप्त user data को सेट करने के लिए
  backendLogin: (email: string, password: string) => Promise<User>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // अगर Firebase User है, तो isLoadingAuth को true रखें और आगे backend login करें
        setIsLoadingAuth(true); 
        try {
          const idToken = await fbUser.getIdToken();
          const res = await apiRequest("POST", `/api/users/login`, { idToken });
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
          setIsAdmin(currentUser.role === 'admin'); 
          console.log("✅ User successfully authenticated and profile fetched from backend.");
        } catch (e: any) {
          console.error("❌ Backend communication failed on auth state change:", e);
          await auth.signOut();
          setAuthError(e as AuthError);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUser(null);
        }
      } else {
        console.log("❌ Firebase auth state changed: User is logged out.");
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        queryClient.clear();
      }
      setIsLoadingAuth(false); // ✅ Firebase auth state change के बाद ही इसे false करें
    });

    return () => unsubscribe();
  }, [queryClient]); // `queryClient` को dependency में रखें

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
      try {
        const idToken = await fbUser.getIdToken();
        const res = await apiRequest("POST", `/api/users/login`, { idToken });
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
        setIsAdmin(currentUser.role === 'admin'); 
      } catch (e) {
        console.error("Failed to refetch user data:", e);
        setAuthError(e as AuthError);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  const backendLogin = useCallback(async (email: string, password: string): Promise<User> => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const res = await apiRequest("POST", "/api/delivery/login", { email, password });
      const backendUser = res.user;

      if (!backendUser) {
        throw new Error("Invalid user data received from backend.");
      }

      // ✅ auth state को मैन्युअल रूप से अपडेट करें
      const currentUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        sellerProfile: backendUser.sellerProfile || null,
      };

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsAdmin(currentUser.role === 'admin');
      setIsLoadingAuth(false);

      return currentUser;

    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingAuth(false);
      throw err;
    }
  }, []);

  const authContextValue = {
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
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
