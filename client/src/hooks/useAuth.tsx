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

// ----------------------
// 👤 User + Seller Info
// ----------------------
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

// ----------------------
// 🔒 Create Auth Context
// ----------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------------
// 🔐 Auth Provider
// ----------------------
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const processUser = async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const decodedToken = await getIdTokenResult(firebaseUser);

        const role = decodedToken.claims.role || "customer";
        const firebaseUid = firebaseUser.uid;
        const email = firebaseUser.email;
        const name = firebaseUser.displayName;

        let seller: SellerInfo | undefined = undefined;
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
        console.error("Auth Error:", error);
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    // Step 1: Listen for onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("🔄 onAuthStateChanged triggered. User:", firebaseUser?.uid || "null");
      processUser(firebaseUser);
    });

    // Step 2: Handle redirect result (Google Login)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("✅ Firebase redirect result user found.");
          processUser(result.user);
        } else {
          console.log("ℹ️ No redirect result user.");
        }
      })
      .catch((error) => {
        console.error("getRedirectResult Error:", error);
      });

    return () => unsubscribe();
  }, []);

  // Logout Function
  const signOut = () => {
    const auth = getAuth(app);
    auth.signOut().then(() => {
      console.log("🚪 Signed out from Firebase");
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

// ----------------------
// 🚀 Custom Hook to Use Auth
// ----------------------
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
