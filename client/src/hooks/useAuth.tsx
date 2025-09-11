import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth"; // Renamed to avoid conflict with your custom User interface
import { useQueryClient } from '@tanstack/react-query';
import { 
  auth,
  onAuthStateChanged,
  handleRedirectResult as firebaseHandleRedirectResult,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser,
  AuthError, // Assuming AuthError is correctly imported and casing is correct
} from "@/lib/firebase"; // Assuming the path is correct and casing is consistent
import { apiRequest } from "@/lib/queryClient"; // Assuming the path is correct and casing is consistent

// --- आपके प्रकारों को ठीक करें ---
export interface SellerInfo { // Renamed
  id: string;
  userId: string; // Renamed
  businessName: string; // Renamed
  approvalStatus: "pending" | "approved" | "rejected"; // Renamed
  rejectionReason?: string | null; // Renamed
  [key: string]: any;
}

export interface User { // Renamed
  id: string;
  uid?: string;
  email: string | null;
  name: string | null;
  role: "customer" | "seller" | "admin" | "delivery";
  sellerProfile?: SellerInfo | null; // Renamed
  idToken?: string; // Renamed
}

interface AuthContextType { // Renamed
  user: User | null; // Renamed
  isLoadingAuth: boolean; // Renamed
  isAuthenticated: boolean; // Renamed
  isAdmin: boolean; // Renamed
  error: AuthError | null; // Renamed
  clearError: () => void; // Renamed
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>; // Renamed and using Promise
  signOut: () => Promise<void>; // Renamed and using Promise
  refetchUser: () => void; // Renamed
  // ✅ नया फ़ंक्शन: backend से प्राप्त user data को सेट करने के लिए
  backendLogin: (email: string, password: string) => Promise<User>; // Renamed and using Promise
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // Renamed

export const AuthProvider = ({ children }: { children: React.ReactNode }) => { // Renamed
  const [user, setUser] = useState<User | null>(null); // Renamed
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Renamed
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Renamed
  const [isAdmin, setIsAdmin] = useState(false); // Renamed
  const [authError, setAuthError] = useState<AuthError | null>(null); // Renamed
  const queryClient = useQueryClient(); // Renamed

  const clearError = useCallback(() => { // Renamed
    setAuthError(null);
  }, []);

  // ✅ यह useEffect केवल Firebase auth state को मैनेज करेगा
  useEffect(() => {
    const checkRedirectResult = async () => { // Renamed
      try {
        await firebaseHandleRedirectResult(); // Renamed
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    checkRedirectResult(); // Call it

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // अगर Firebase user है, तो isLoadingAuth को true रखें और आगे backend login करें
        setIsLoadingAuth(true); 
        try {
          const idToken = await fbUser.getIdToken(); // Renamed
          const res = await apiRequest("POST", `/api/users/login`, { idToken }); // Renamed, POST for consistency
          const dbUserData = res.user; // Renamed
          
          const currentUser: User = { // Renamed
            uid: fbUser.uid,
            id: dbUserData?.id,
            email: fbUser.email || dbUserData?.email,
            name: fbUser.displayName || dbUserData?.name, // Renamed
            role: dbUserData?.role || 'customer',
            idToken: idToken, // Renamed
            sellerProfile: dbUserData?.sellerProfile || null, // Renamed
          };
          
          setUser(currentUser); // Renamed
          setIsAuthenticated(true); // Renamed
          setIsAdmin(currentUser.role === 'admin'); // Renamed
          console.log("✅ User successfully authenticated and profile fetched from backend.");
          
        } catch (e: any) {
          console.error("❌ Backend communication failed on auth state change:", e);
          await auth.signOut(); // Renamed
          setAuthError(e as AuthError); // Renamed
          setIsAuthenticated(false); // Renamed
          setIsAdmin(false); // Renamed
          setUser(null); // Renamed
        }
      } else {
        console.log("❌ Firebase auth state changed: User is logged out.");
        setUser(null); // Renamed
        setIsAuthenticated(false); // Renamed
        setIsAdmin(false); // Renamed
        queryClient.clear(); // Renamed
      }
      setIsLoadingAuth(false); // ✅ Firebase auth state change के बाद ही इसे false करें
    });

    return () => unsubscribe();
  }, [queryClient]); // `queryClient` को dependency में रखें

  const signIn = useCallback(async (usePopup: boolean = false): Promise<FirebaseUser | null> => { // Renamed and using Promise
    setIsLoadingAuth(true); // Renamed
    setAuthError(null); // Renamed
    try {
      const fbUser = await firebaseSignInWithGoogle(usePopup); // Renamed
      return fbUser;
    } catch (err: any) {
      setAuthError(err as AuthError); // Renamed
      setIsLoadingAuth(false); // Renamed
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => { // Renamed
    try {
      await signOutUser(); // Renamed
      setAuthError(null); // Renamed
      setUser(null); // Renamed
      setIsAuthenticated(false); // Renamed
      setIsAdmin(false); // Renamed
      queryClient.clear(); // Renamed
    } catch (err: any) {
      setAuthError(err as AuthError); // Renamed
      throw err;
    }
  }, [queryClient]); // Renamed

  const refetchUser = useCallback(async () => { // Renamed
    setIsLoadingAuth(true); // Renamed
    const fbUser = auth.currentUser; // Renamed
    if (fbUser) {
      try {
        const idToken = await fbUser.getIdToken(); // Renamed
        const res = await apiRequest("POST", `/api/users/login`, { idToken }); // Renamed, POST for consistency
        const dbUserData = res.user; // Renamed
        
        const currentUser: User = { // Renamed
          uid: fbUser.uid,
          id: dbUserData?.id,
          email: fbUser.email || dbUserData?.email,
          name: fbUser.displayName || dbUserData?.name, // Renamed
          role: dbUserData?.role || 'customer',
          idToken: idToken, // Renamed
          sellerProfile: dbUserData?.sellerProfile || null, // Renamed
        };
        setUser(currentUser); // Renamed
        setIsAuthenticated(true); // Renamed
        setIsAdmin(currentUser.role === 'admin'); // Renamed
      } catch (e) {
        console.error("Failed to refetch user data:", e); // Renamed
        setAuthError(e as AuthError); // Renamed
        setIsAuthenticated(false); // Renamed
        setIsAdmin(false); // Renamed
      }
    }
    setIsLoadingAuth(false); // Renamed
  }, []);

  const backendLogin = useCallback(async (email: string, password: string): Promise<User> => { // Renamed and using Promise
    setAuthError(null); // Renamed
    setIsLoadingAuth(true); // Renamed
    try {
      const res = await apiRequest("POST", "/api/delivery/login", { email, password });
      const backendUser = res.user; // Renamed

      if (!backendUser) {
        throw new Error("Invalid user data received from backend."); // Using Error
      }

      // ✅ auth state को मैन्युअल रूप से अपडेट करें
      const currentUser: User = { // Renamed
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role,
        sellerProfile: backendUser.sellerProfile || null, // Renamed
      };

      setUser(currentUser); // Renamed
      setIsAuthenticated(true); // Renamed
      setIsAdmin(currentUser.role === 'admin'); // Renamed
      setIsLoadingAuth(false); // Renamed

      return currentUser; // Renamed

    } catch (err: any) {
      setAuthError(err as AuthError); // Renamed
      setIsLoadingAuth(false); // Renamed
      throw err;
    }
  }, []);

  const authContextValue = { // Renamed
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
    <AuthContext.Provider value={authContextValue}> // Renamed
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => { // Renamed
  const ctx = useContext(AuthContext); // Renamed
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider"); // Renamed and using Error
  return ctx;
};
