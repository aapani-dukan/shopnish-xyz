// client/src/hooks/useAuth.tsx

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

// --- Types ---
export interface SellerInfo {
  id: string;
  userId: string;
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  [key: string]: any;
}

export interface User {
  id?: string;
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

  // 🔑 This function is for fetching data from the backend.
  // We will assume the user is already in the database when this is called.
  const fetchBackendUserData = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const res = await apiRequest("GET", "/api/users/me");
      const dbUserData = res.user || res;

      if (dbUserData) {
        const idToken = await fbUser.getIdToken(true);
        const newUserData: User = {
          uid: fbUser.uid,
          id: dbUserData.id,
          email: fbUser.email || dbUserData.email,
          name: fbUser.displayName || dbUserData.name,
          role: dbUserData.role || "customer",
          idToken,
          sellerProfile: dbUserData.sellerProfile || null,
        };

        setUser(newUserData);
        setIsAuthenticated(true);
        setIsAdmin(newUserData.role === "admin");
        console.log("✅ Backend user data fetched:", newUserData);
      }
    } catch (e: any) {
      console.error("❌ Failed to fetch backend user data:", e);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // ✅ This is the main listener. It should just fetch the user data.
  // The initial login logic happens in the `signIn` function.
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
      console.log("onAuthStateChanged triggered. fbUser:", fbUser ? fbUser.email : "null");
      if (fbUser) {
        await fetchBackendUserData(fbUser);
      } else {
        console.warn("❌ No Firebase user. Clearing state.");
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        queryClient.clear();
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [fetchBackendUserData, queryClient]);

  // ✅ This is the Google sign-in logic. It handles new and existing users.
  const signIn = useCallback(
    async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const fbUser = await firebaseSignInWithGoogle(usePopup);
        if (fbUser) {
          // This is the key: we call the initial-login endpoint which
          // will create the user if they are new. This request should
          // never fail for a new user if the backend is configured.
          const idToken = await fbUser.getIdToken(true);
          const response = await fetch(`${API_BASE}/api/auth/initial-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ idToken }),
          });
          if (!response.ok) {
            throw new Error("Backend authentication failed.");
          }
          const userData = await response.json();
          setUser(userData.user);
          setIsAuthenticated(true);
        }
        return fbUser;
      } catch (err: any) {
        setAuthError(err as AuthError);
        setIsLoadingAuth(false);
        throw err;
      }
    },
    []
  );

  // ... (Other functions like signOut, refetchUser, backendLogin are unchanged)
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutUser();
      console.log("✅ User signed out.");
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
      await fetchBackendUserData(fbUser);
    } else {
      setIsLoadingAuth(false);
    }
  }, [fetchBackendUserData]);

  const backendLogin = useCallback(
    async (email: string, password: string): Promise<User> => {
      setAuthError(null);
      setIsLoadingAuth(true);
      try {
        const res = await apiRequest("POST", "/api/delivery/login", {
          email,
          password,
        });
        const backendUser = res.user;
        if (!backendUser)
          throw new Error("Invalid user data received from backend.");
        const newUserData: User = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          role: backendUser.role,
          sellerProfile: backendUser.sellerProfile || null,
        };
        setUser(newUserData);
        setIsAuthenticated(true);
        setIsAdmin(newUserData.role === "admin");
        console.log("✅ Delivery backend login success:", newUserData);
        setIsLoadingAuth(false);
        return newUserData;
      } catch (err: any) {
        console.error("❌ Delivery backend login failed:", err);
        setAuthError(err as AuthError);
        setIsLoadingAuth(false);
        throw err;
      }
    },
    []
  );

  const authContextValue = useMemo(
    () => ({
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
    }),
    [
      user,
      isLoadingAuth,
      isAuthenticated,
      isAdmin,
      authError,
      clearError,
      signIn,
      signOut,
      refetchUser,
      backendLogin,
    ]
  );
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

