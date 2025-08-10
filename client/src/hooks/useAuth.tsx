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

// ... (आपके प्रकार यहाँ अपरिवर्तित रहेंगे)
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
  idToken: string | null; 
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

// ... (आपका authenticatedApiRequest फंक्शन यहाँ अपरिवर्तित रहेगा)
export async function authenticatedApiRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: any, idToken?: string | null) {
  // ...
  if (!idToken) {
    // अगर idToken null है, तो हम मान लेते हैं कि यह एडमिन सेशन है और आगे बढ़ते हैं
    // लेकिन आपको अपने सर्वर साइड पर भी इसकी जांच करनी चाहिए
    if (url === '/api/users/me') {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Admin session is invalid.");
      }
      return response;
    }
    throw new Error("Authentication token is missing for API request.");
  }
  //...
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [adminUser, setAdminUser] = useState<User | null>(null);

  const { data: serverUser, isLoading: isLoadingServerUser, error: queryError, refetch } = useQuery({
    queryKey: ['userProfile', firebaseUser?.uid || adminUser?.uid], // ✅ adminUser.uid को भी जोड़ें
    queryFn: async () => {
      // ✅ अगर adminUser है तो सीधे उसे वापस भेज दें, सर्वर कॉल न करें
      if (adminUser) {
        return adminUser;
      }
      if (!firebaseUser || !idToken) return null;

      // ... (बाकी का API कॉल लॉजिक)
      try {
        const res = await authenticatedApiRequest("GET", `/api/users/me`, undefined, idToken);
        const dbUserData = await res.json();
        
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
        if (e.status === 404) {
          console.warn("User profile not found in DB. Creating a new user.");
          // ... (नया user बनाने का लॉजिक)
        }
        console.error("Failed to fetch user data from DB:", e);
        throw e;
      }
    },
    // ✅ `enabled` फ्लैग को सरल बनाएँ
    enabled: !!firebaseUser && !!idToken, 
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // ✅ यह useEffect एडमिन सेशन को handle करेगा
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const userData = await res.json();
          if (userData.role === 'admin') {
            setAdminUser(userData);
            // यहाँ idToken की जरूरत नहीं है क्योंकि हम एक session cookie पर निर्भर करते हैं
            setIsLoadingFirebase(false); 
            return;
          }
        }
      } catch (e) {
        // अगर API कॉल फेल होता है, तो कोई बात नहीं।
      }
      setAdminUser(null);
      setIsLoadingFirebase(false); // ✅ यहाँ भी isLoadingFirebase को false करें
    };

    checkAdminSession();
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
      setFirebaseUser(fbUser);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setIdToken(idToken);
      } else {
        if (!adminUser) {
          setIdToken(null);
          queryClient.clear();
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient, adminUser]); 

  const userToUse = firebaseUser ? serverUser : adminUser;
  // ✅ isLoadingAuth की गणना को ठीक करें
  const isLoadingAuth = isLoadingFirebase || isLoadingServerUser;
  const isAuthenticated = !!userToUse;

  // ... (बाकी के फंक्शन्स जैसे signIn, signOut, clearError अपरिवर्तित रहेंगे)
  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
    // ...
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setAuthError(null);
      setFirebaseUser(null);
      setAdminUser(null);
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
    user: userToUse,
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
