// client/src/hooks/useAuth.tsx

import { useEffect, useState, createContext, useContext } from "react";
import {
  getAuth,
  onAuthStateChanged,
  getIdTokenResult,
  getRedirectResult,
  User as FirebaseUser,
} from "firebase/auth";
import { app } from "@/lib/firebase";
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
  firebaseUid: string;
}

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    // Function to process the Firebase user object
    const processUser = async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      try {
        // Get the ID token and decoded claims
        const idToken = await firebaseUser.getIdToken();
        const decodedToken = await getIdTokenResult(firebaseUser);

        // Determine the role from custom claims; default to 'customer'
        const role = decodedToken.claims.role || "customer";
        const firebaseUid = firebaseUser.uid;
        const email = firebaseUser.email;
        const name = firebaseUser.displayName;

        let seller: SellerInfo | undefined = undefined;
        // यदि role 'seller' है, तो backend से seller info fetch करें
        if (role === "seller") {
          try {
            const res = await apiRequest("GET", "/api/sellers/me", undefined, idToken);
            seller = res.data;
          } catch (error) {
            console.warn("Seller info fetch failed:", error);
          }
        }

        setUser({ uid: firebaseUser.uid, firebaseUid, email, name, role, seller, idToken });
      } catch (error) {
        console.error("Auth processing error:", error);
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    // STEP 1: Handle redirect result first
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Redirect result user found:", result.user.uid);
          processUser(result.user);
        } else {
          console.log("ℹ️ No redirect result user.");
          // Fallback: Listener will handle current auth state
          setIsLoadingAuth(false);
        }
      })
      .catch((error) => {
        console.error("getRedirectResult error:", error);
      });

    // STEP 2: Set up the onAuthStateChanged listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔄 onAuthStateChanged triggered. User:", firebaseUser?.uid || "null");
      processUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  const signOut = () => {
    const auth = getAuth(app);
    auth.signOut().then(() => {
      console.log("🚪 User signed out.");
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        isAuthenticated: !!user,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
