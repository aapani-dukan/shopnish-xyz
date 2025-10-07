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
  // 🚀 New: Import Email/Password functions from firebase utility
  signInWithEmail as firebaseSignInWithEmail,
  signUpWithEmail as firebaseSignUpWithEmail,
} from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

// --- Types (No changes here, repeated for completeness) ---
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
  signIn: (usePopup?: boolean) => Promise<FirebaseUser | null>; // Google Auth
  signOut: () => Promise<void>;
  refetchUser: () => void;
  backendLogin: (email: string, password: string) => Promise<User>; // Delivery/Backend-only login

  // 🚀 New: Email/Password Auth functions
  signInWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseUser | null>;
  signUpWithEmailAndPassword: (email: string, password: string) => Promise<FirebaseUser | null>;
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

  // ✅ Consolidated logic for fetching and syncing backend user
  const fetchAndSyncBackendUser = useCallback(async (fbUser: FirebaseUser) => {
    setIsLoadingAuth(true);
    let dbUserData = null;
    const idToken = await fbUser.getIdToken(true);

    try {
      // ✅ 1. Attempt to fetch existing user data
      const res = await apiRequest("GET", "/api/users/me");
      dbUserData = res.user || res;
      console.log("✅ Backend user data fetched:", dbUserData);
    } catch (e: any) {
      if (e.status === 404) {
        // ✅ 2. If 404, attempt to create a new user
        console.warn("User not found on backend. Attempting initial login.");
        try {
          const res = await apiRequest("POST", "/api/auth/initial-login", {
            idToken,
          });
          dbUserData = res.user;
          console.log("✅ New user profile created via initial login.");
        } catch (initialLoginError: any) {
          // This handles any other errors during initial login (e.g., 401)
          console.error("❌ Initial login failed:", initialLoginError);
          setAuthError(initialLoginError);
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsLoadingAuth(false);
          return; // Exit the function
        }
      } else {
        // Handle any other non-404 errors from the GET request
        console.error("❌ Failed to fetch backend user data:", e);
        setAuthError(e);
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsLoadingAuth(false);
        return; // Exit the function
      }
    }

    // ✅ 3. If we have data, set the state
    if (dbUserData) {
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
    }

    setIsLoadingAuth(false);
  }, []);

  // ✅ Firebase + Backend sync Listener
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
      console.log(
        "onAuthStateChanged triggered. fbUser:",
        fbUser ? fbUser.email : "null"
      );

      if (fbUser) {
        // Only run fetchAndSync if user data is not yet loaded
        if (!user || user.uid !== fbUser.uid) {
            await fetchAndSyncBackendUser(fbUser);
        } else {
            // Already authenticated and synced, just update loading state
            setIsLoadingAuth(false);
        }
      } else {
        console.warn("❌ No Firebase user. Clearing state.");
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        queryClient.clear();
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [fetchAndSyncBackendUser, queryClient, user]); // Added user dependency to prevent re-sync loop

  // --- 1. Google Sign In Handler ---
  const signIn = useCallback(
    async (usePopup: boolean = false): Promise<FirebaseUser | null> => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const fbUser = await firebaseSignInWithGoogle(usePopup);
        // If redirect is used, fbUser is null, and the listener handles it.
        // If popup is used and successful, we sync immediately.
        if (fbUser) {
          await fetchAndSyncBackendUser(fbUser);
        }
        return fbUser;
      } catch (err: any) {
        setAuthError(err as AuthError);
        setIsLoadingAuth(false);
        throw err;
      }
    },
    [fetchAndSyncBackendUser]
  );
  
  // --- 2. 🚀 Email/Password Sign In Handler ---
  const signInWithEmailAndPassword = useCallback(
    async (email: string, password: string): Promise<FirebaseUser | null> => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        const fbUser = await firebaseSignInWithEmail(email, password);
        if (fbUser) {
          await fetchAndSyncBackendUser(fbUser);
        }
        return fbUser;
      } catch (err: any) {
        // Email/Password login failures are AuthErrors
        setAuthError(err as AuthError);
        setIsLoadingAuth(false);
        throw err;
      }
    },
    [fetchAndSyncBackendUser]
  );
  
  // --- 3. 🚀 Email/Password Sign Up Handler ---
  const signUpWithEmailAndPassword = useCallback(
    async (email: string, password: string): Promise<FirebaseUser | null> => {
      setIsLoadingAuth(true);
      setAuthError(null);
      try {
        // Note: Sign Up typically doesn't need immediate backend sync 
        // because the successful sign up automatically triggers the 
        // onAuthStateChanged listener, which handles the sync via fetchAndSyncBackendUser.
        // However, we return the user for immediate success feedback in the UI.
        const fbUser = await firebaseSignUpWithEmail(email, password);
        // After sign up, the user is signed in, so onAuthStateChanged will handle the rest.
        return fbUser; 
      } catch (err: any) {
        setAuthError(err as AuthError);
        setIsLoadingAuth(false);
        throw err;
      }
    },
    [] // No dependency needed as it relies on firebase utility and global listener
  );

  // --- Sign Out Handler ---
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

  // --- Refetch User Handler ---
  const refetchUser = useCallback(async () => {
    setIsLoadingAuth(true);
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fetchAndSyncBackendUser(fbUser);
    } else {
      setIsLoadingAuth(false);
    }
  }, [fetchAndSyncBackendUser]);

  // --- Backend Login Handler (for delivery/admin if Firebase isn't used) ---
  const backendLogin = useCallback(
    async (email: string, password: string): Promise<User> => {
      setAuthError(null);
      setIsLoadingAuth(true);
      try {
        // NOTE: This assumes a custom /api/delivery/login endpoint that returns a backend token/user
        // If successful, this function bypasses Firebase Auth State
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
      // 🚀 New additions
      signInWithEmailAndPassword,
      signUpWithEmailAndPassword,
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
      signInWithEmailAndPassword,
      signUpWithEmailAndPassword,
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
