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
  idToken: string | null; // ✅ idToken को nullable बनायें
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
    throw new Error("Authentication token is missing for API request.");
  }
  // ...
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingFirebase, setIsLoadingFirebase] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ✅ AdminUser state को जोड़ें
  const [adminUser, setAdminUser] = useState<User | null>(null);

  const { data: serverUser, isLoading: isLoadingServerUser, error: queryError, refetch } = useQuery({
    queryKey: ['userProfile', firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser || !idToken) return null;

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
          try {
            const newUserProfile = await authenticatedApiRequest("POST", `/api/register`, {
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              role: "customer",
              firstName: '',
              lastName: '',
              phone: '',
              address: '',
              city: '',
              pincode: '',
            }, idToken);

            const newDbUserData = await newUserProfile.json();

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
          } catch (createError) {
            console.error("Failed to create new user in DB:", createError);
            throw createError;
          }
        }
        console.error("Failed to fetch user data from DB:", e);
        throw e;
      }
    },
    enabled: !!firebaseUser && !!idToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // ✅ यह नया useEffect एडमिन सेशन को handle करेगा
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const userData = await res.json();
          if (userData.role === 'admin') {
            setAdminUser(userData);
            setIsLoadingFirebase(false);
            setIdToken("admin-token"); // एक डमी टोकन सेट करें
            return;
          }
        }
      } catch (e) {
        // अगर API कॉल फेल होता है, तो कोई बात नहीं।
      }
      setAdminUser(null);
    };

    checkAdminSession();
    // इस useEffect को सिर्फ एक बार चलाएँ
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
      setIsLoadingFirebase(false);
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        setIdToken(idToken);
      } else {
        // Firebase user null है, तो admin सेशन की जाँच की गई है।
        // अगर admin user है, तो idToken को null न करें।
        if (!adminUser) {
          setIdToken(null);
          queryClient.clear();
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient, adminUser]); // ✅ adminUser को डिपेंडेंसी में जोड़ें

  const userToUse = user || adminUser;
  const isLoadingAuth = isLoadingFirebase || (!!firebaseUser && isLoadingUser);
  const isAuthenticated = !!userToUse && !!(idToken || (adminUser && idToken));

  // ... (बाकी के फंक्शन्स जैसे signIn, signOut, clearError अपरिवर्तित रहेंगे)
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
      setAdminUser(null); // ✅ Admin user को भी clear करें
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
    
