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
          // ✅ यहाँ सीधे apiRequest का उपयोग करें
          const res = await apiRequest("GET", `/api/users/me`);
          const dbUserData = res;
          
          const role = dbUserData?.role || 'customer'; 
          
          const currentUser: User = {
            uid: fbUser.uid,
            id: dbUserData?.id,
            email: fbUser.email || dbUserData?.email,
            name: fbUser.displayName || dbUserData?.name,
            role: role,
            idToken: await fbUser.getIdToken(),
            sellerProfile: dbUserData?.sellerProfile || null,
          };
          
          setUser(currentUser);
          setIsAuthenticated(true);
          
        } catch (e: any) {
          if (e.status === 404) {
            console.warn("User profile not found in DB. Creating a new user.");
            try {
              const newUserProfile = await apiRequest("POST", `/api/register`, {
                firebaseUid: fbUser.uid,
                email: fbUser.email,
                name: fbUser.displayName,
                role: "customer",
                firstName: '',
                lastName: '',
                phone: '',
                address: '',
                city: '',
                pincode: '',
              });
              const newDbUserData = newUserProfile;
              
              const newUser: User = {
                uid: fbUser.uid,
                id: newDbUserData?.id, 
                email: fbUser.email,
                name: fbUser.displayName,
                role: "customer",
                idToken: await fbUser.getIdToken(),
                sellerProfile: null,
              };
              setUser(newUser);
              setIsAuthenticated(true);
            } catch (createError) {
              console.error("Failed to create new user in DB:", createError);
              setAuthError(createError as AuthError);
              setIsAuthenticated(false);
            }
          } else {
            console.error("Failed to fetch user data from DB:", e);
            setAuthError(e as AuthError);
            setIsAuthenticated(false);
          }
        }
      } else {
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

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const refetchUser = useCallback(async () => {
    // यह फ़ंक्शन user डेटा को मैन्युअल रूप से रिफ्रेश करने के लिए है।
    setIsLoadingAuth(true);
    const fbUser = auth.currentUser;
    if (fbUser) {
      try {
        const res = await apiRequest("GET", `/api/users/me`);
        const dbUserData = res;
        
        const role = dbUserData?.role || 'customer'; 
        
        const currentUser: User = {
          uid: fbUser.uid,
          id: dbUserData?.id,
          email: fbUser.email || dbUserData?.email,
          name: fbUser.displayName || dbUserData?.name,
          role: role,
          idToken: await fbUser.getIdToken(),
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
