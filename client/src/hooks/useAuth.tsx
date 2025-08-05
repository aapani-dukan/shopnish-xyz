// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { 
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
} from "@/lib/firebase";
import { queryClient } from '@/lib/queryClient';

// --- आपके प्रकारों को ठीक करें ---
interface SellerInfo {
  id: string;
  userId: string;
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  [key: string]: any;
}

interface User {
  uid: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null;
  idToken: string;
  id?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
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

// ✅ यहाँ authenticatedApiRequest फ़ंक्शन में कोई बदलाव नहीं किया है,
// क्योंकि यह लॉजिकली सही है। समस्या कहीं और है।
export async function authenticatedApiRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: any, idToken?: string) {
  if (!idToken) {
    throw new Error("Authentication token is missing for API request.");
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  };

  const options: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
      const errorMessage = errorData?.error || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response;
  } catch (e: any) {
    console.error("API Request Failed:", e);
    throw new Error(`Failed to perform API request: ${e.message || 'Unknown error'}`);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const processAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setError(null);
      setIsLoadingAuth(false);
      queryClient.removeQueries();
      return;
    }

    try {
      // ✅ प्रोसेस शुरू होने पर इसे true करें
      setIsLoadingAuth(true);

      const idToken = await firebaseUser.getIdToken();
      const decodedToken = await firebaseUser.getIdTokenResult();
      const firebaseRole: User['role'] = (decodedToken.claims.role as User['role']) || "customer";

      const email = firebaseUser.email;
      const name = firebaseUser.displayName;

      let dbUserData: User | null = null;
      let sellerProfileData: SellerInfo | null = null;
      
      // ✅ Fetch user data from your DB
      try {
        const res = await authenticatedApiRequest("GET", `/api/users/me?firebaseUid=${firebaseUser.uid}`, undefined, idToken);
        const data = await res.json();
        dbUserData = data.user;
      } catch (apiError: any) {
        console.warn("DB User info fetch failed, using Firebase data:", apiError.message || apiError);
        setError({ code: "db/user-fetch-failed", message: "Failed to fetch full user info from database." });
      }

      // ✅ Fetch seller profile data (if applicable)
      if (firebaseRole === "seller" || dbUserData?.role === "seller") {
        try {
          const res = await authenticatedApiRequest("GET", "/api/sellers/me", undefined, idToken);
          // ✅ यहाँ डेटा को JSON में बदलने से पहले जांच करें
          const textData = await res.text();
          if (textData) {
            sellerProfileData = JSON.parse(textData) as SellerInfo;
            console.log("Seller info fetched:", sellerProfileData);
          } else {
            console.log("Seller profile not found for user (empty response).");
            sellerProfileData = null;
          }
        } catch (apiError: any) {
          if (apiError.message && apiError.message.includes('404')) {
            console.log("Seller profile not found for user (404).");
            sellerProfileData = null;
          } else {
            console.warn("Seller profile fetch failed:", apiError.message || apiError);
            setError({ code: "seller/profile-fetch-failed", message: "Failed to fetch seller profile." });
          }
        }
      }

      const finalRole: User['role'] = dbUserData?.role || firebaseRole;
      const finalApprovalStatus = dbUserData?.approvalStatus || sellerProfileData?.approvalStatus || undefined;

      const currentUser: User = {
        uid: firebaseUser.uid,
        id: dbUserData?.id,
        email: email || dbUserData?.email,
        name: name || dbUserData?.name,
        role: finalRole,
        idToken: idToken,
        sellerProfile: sellerProfileData, 
        approvalStatus: finalApprovalStatus, 
      };

      setUser(currentUser);
      setIsLoadingAuth(false);
      setError(null);
      console.log("User processed and set:", currentUser.uid, "Role:", currentUser.role, "Approval Status:", currentUser.approvalStatus);

    } catch (err: any) {
      console.error("Auth processing error:", err);
      setUser(null);
      setIsLoadingAuth(false); // ✅ एरर होने पर इसे false करें
      setError({ code: err.code || "auth/processing-error", message: err.message || "Failed to process user data." });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkRedirect = async () => {
      if (user || !isMounted) return;
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
        setIsLoadingAuth(false);
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [user, processAndSetUser]);

  useEffect(() => {
    console.log("🔄 Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("🔄 onAuthStateChanged listener fired. fbUser:", fbUser?.uid || "null");
      if (fbUser && fbUser.uid !== user?.uid || (!fbUser && user)) {
        await processAndSetUser(fbUser);
      } else {
        setIsLoadingAuth(false);
      }
    });

    return () => {
      console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [user, processAndSetUser]);

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingAuth(true);
    setError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      return fbUser; 
    } catch (err: any) {
      console.error("Auth Provider: Error during signIn:", err);
      setError(err as AuthError);
      setUser(null);
      setIsLoadingAuth(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log("Auth Provider: Attempting to sign out...");
      await signOutUser();
      setError(null);
      console.log("✅ Signed out successfully. State reset.");
      queryClient.clear();
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
    
