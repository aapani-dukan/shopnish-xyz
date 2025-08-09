// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError,
} from "@/lib/firebase";

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
      const errorText = await response.text();
      let errorData = null;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
      const errorMessage = errorData?.error || errorData?.message || errorText || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
      return { ok: true, json: () => Promise.resolve({}) };
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
  const queryClient = useQueryClient();

  // ✅ useQuery को अपडेट किया गया है
  const { data: user, isLoading: isLoadingUser, error: queryError, refetch } = useQuery({
    queryKey: ['userProfile', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser || !idToken) return null;

      try {
        const res = await authenticatedApiRequest("GET", `/api/users/me`, undefined, idToken);
        const { user: dbUserData } = await res.json();
        
        const role = dbUserData?.role || 'customer'; 
        
        const currentUser: User = {
          uid: firebaseUser.uid,
          id: dbUserData?.id,
          email: firebaseUser.email || dbUserData?.email,
          name: firebaseUser.displayName || dbUserData?.name,
          role: role,
          idToken: idToken,
          sellerProfile: dbUserData?.sellerProfile || null,
        };
        
        return currentUser;
      } catch (e: any) {
        if (e.message.includes('404')) {
          // ✅ यहाँ नया लॉजिक जोड़ा गया है: 404 पर नया उपयोगकर्ता बनाएं
          console.warn("User profile not found in DB. Creating a new user.");
          const newUserProfile = await authenticatedApiRequest("POST", `/api/users`, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            role: "customer", // डिफ़ॉल्ट रोल
          }, idToken);

          const { user: newDbUserData } = await newUserProfile.json();

          const newUser: User = {
            uid: firebaseUser.uid,
            id: newDbUserData?.id, 
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            role: "customer",
            idToken: idToken,
            sellerProfile: null,
          };
          return newUser;
        }
        console.error("Failed to fetch user data from DB:", e);
        throw e;
      }
    },
    enabled: !!firebaseUser && !!idToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
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
    return () => unsubscribe();
  }, [queryClient]);

  const isLoadingAuth = isLoadingFirebase || (!!firebaseUser && isLoadingUser);
  const isAuthenticated = !!user && !!idToken;

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    setIsLoadingFirebase(true);
    setAuthError(null);
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup);
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError);
      setIsLoadingFirebase(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setAuthError(null);
      setFirebaseUser(null);
      setIdToken(null);
      queryClient.clear();
    } catch (err: any) {
      setAuthError(err as AuthError);
      throw err;
    }
  }, [queryClient]);

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
    refetchUser: refetch,
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
