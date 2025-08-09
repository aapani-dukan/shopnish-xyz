// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQuery } from '@tanstack/react-query'; // ✅ यहाँ useQuery को इंपोर्ट करें
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
  refetchUser: () => void; // ✅ refetchUser फ़ंक्शन जोड़ें
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // ✅ React Query का उपयोग करके user data fetch करें
  const { data: user, isLoading: isLoadingUser, error: queryError, refetch } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      if (!firebaseUser || !idToken) return null;

      try {
        const res = await authenticatedApiRequest("GET", `/api/users/me?firebaseUid=${firebaseUser.uid}`, undefined, idToken);
        const data = await res.json();
        const dbUserData = data.user;
        const firebaseRole: User['role'] = (await firebaseUser.getIdTokenResult()).claims.role as User['role'] || "customer";

        let sellerProfileData: SellerInfo | null = null;
        if (dbUserData?.role === "seller") {
          const res = await authenticatedApiRequest("GET", "/api/sellers/me", undefined, idToken);
          const textData = await res.text();
          sellerProfileData = textData ? JSON.parse(textData) as SellerInfo : null;
        }

        const currentUser: User = {
          uid: firebaseUser.uid,
          id: dbUserData?.id,
          email: firebaseUser.email || dbUserData?.email,
          name: firebaseUser.displayName || dbUserData?.name,
          role: dbUserData?.role || firebaseRole,
          idToken: idToken,
          sellerProfile: sellerProfileData, 
          approvalStatus: dbUserData?.approvalStatus || sellerProfileData?.approvalStatus, 
        };
        return currentUser;
      } catch (e) {
        console.error("Failed to fetch user data from DB:", e);
        throw e;
      }
    },
    enabled: !!firebaseUser && !!idToken,
    staleTime: 1000 * 60 * 5, // 5 मिनट तक डेटा को stale ना मानें
    retry: false,
  });

  // ✅ onAuthStateChanged listener को FirebaseUser सेट करने के लिए उपयोग करें
  useEffect(() => {
    console.log("🔄 Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("🔄 onAuthStateChanged listener fired. fbUser:", fbUser?.uid || "null");
      setFirebaseUser(fbUser);
      setIsLoadingFirebase(false);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setIdToken(idToken);
      } else {
        setIdToken(null);
        queryClient.clear();
      }
    });

    return () => {
      console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  const isLoadingAuth = isLoadingFirebase || isLoadingUser;
  const isAuthenticated = !!user;

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingFirebase(true);
    setAuthError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      return fbUser; 
    } catch (err: any) {
      console.error("Auth Provider: Error during signIn:", err);
      setAuthError(err as AuthError);
      setIsLoadingFirebase(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log("Auth Provider: Attempting to sign out...");
      await signOutUser();
      setAuthError(null);
      setFirebaseUser(null);
      setIdToken(null);
      queryClient.clear();
      console.log("✅ Signed out successfully. State reset.");
    } catch (err: any) {
      console.error("❌ Error during sign out:", err);
      setAuthError(err as AuthError);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const authContextValue = {
    user,
    isLoadingAuth,
    isAuthenticated,
    error: authError || queryError,
    clearError,
    signIn,
    signOut,
    refetchUser: refetch, // ✅ refetch फ़ंक्शन को context में expose करें
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

