// client/src/hooks/useAuth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient"; // तुम्हारा custom API helper

interface SellerInfo {
  id: string;
  approvalStatus: "pending" | "approved" | "rejected";
}

interface User {
  uid: string;
  email: string | null;
  name: string | null;
  role: "seller" | "admin" | "delivery" | "customer";
  seller?: SellerInfo;
}

interface AuthContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      setLoading(true);

      try {
        await getRedirectResult(auth); // Firebase redirect result

        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            const res = await apiRequest("GET", "/api/sellers/me", {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.success) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                role: "seller",
                seller: res.seller,
              });
            } else {
              // No seller profile, treat as customer
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                role: "customer",
              });
            }
          } else {
            setUser(null);
          }

          setLoading(false);
        });
      } catch (err) {
        console.error("AuthProvider error:", err);
        setLoading(false);
      }
    };

    handleAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth: loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
