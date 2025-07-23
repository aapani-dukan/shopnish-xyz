// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  auth,
  app,
  onAuthStateChange,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
  AuthResult
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient"; 

interface SellerInfo {
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
}

interface User {
  uid: string;
  email: string | null;
  name: string | null;
  role: "seller" | "admin" | "delivery" | "customer";
  seller?: SellerInfo;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const processAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setError(null);
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
          // ✅ सर्वर से seller info fetch करें
          const res = await apiRequest("GET", "/api/sellers/me", undefined, idToken);
          const responseData = await res.json();
          seller = responseData as SellerInfo;
          console.log("Seller info fetched:", seller);
        } catch (apiError: any) {
          console.warn("Seller info fetch failed:", apiError.message || apiError);
          setError({ code: "seller/info-fetch-failed", message: "Failed to fetch seller info." });
        }
      }

      setUser({ uid: firebaseUser.uid, email, name, role, seller, idToken });
      setIsLoadingAuth(false);
      setError(null);
      console.log("User processed and set:", firebaseUser.uid, "Role:", role);

    } catch (err: any) {
      console.error("Auth processing error:", err);
      setUser(null);
      setIsLoadingAuth(false);
      setError({ code: err.code || "auth/processing-error", message: err.message || "Failed to process user data." });
    }
  }, []);

  useEffect(() => {
    console.log("🔄 Checking for redirect result...");
    const checkRedirect = async () => {
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
  }, [processAndSetUser]);

  // ✅ यह useEffect लूप को रोकने के लिए सही किया गया है
  useEffect(() => {
    console.log("🔄 Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChange(async (fbUser) => {
      console.log("🔄 onAuthStateChanged listener fired. fbUser:", fbUser?.uid || "null");
      await processAndSetUser(fbUser);
    });

    return () => {
      console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [processAndSetUser]); // ✅ अब यह केवल processAndSetUser पर निर्भर करता है

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      if (fbUser) {
        await processAndSetUser(fbUser);
      }
      return fbUser; 
    } catch (err: any) {
      console.error("Auth Provider: Error during signIn:", err);
      setError(err as AuthError);
      setUser(null);
      setIsLoadingAuth(false);
      throw err;
    }
  }, [processAndSetUser]);

  const signOut = useCallback(async () => {
    try {
      console.log("Auth Provider: Attempting to sign out...");
      await signOutUser();
      setError(null);
      console.log("✅ Signed out successfully. State reset.");
    } catch (err: any) {
      console.error("❌ Error during sign out:", err);
      setError(err as AuthError);
      throw err;
    }
  }, []);

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
