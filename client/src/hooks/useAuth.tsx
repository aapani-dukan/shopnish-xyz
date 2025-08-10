// client/src/hooks/useAuth.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { User, auth } from "@/lib/firebase"; // Assuming this is your client-side firebase config
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // TanStack Query to fetch user data from server
  const { data: serverUser, isLoading: isLoadingServerUser, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data;
    },
    enabled: isAuthenticated, // Only run this query if the user is authenticated
  });

  useEffect(() => {
    // 1. Firebase Auth listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
      } else {
        // 2. Check for admin session separately
        const isAdmin = localStorage.getItem("isAdmin") === "true";
        if (isAdmin) {
          // If admin, create a mock user object for consistency
          setUser({
            uid: "admin",
            email: "admin@shopnish.com", // You can use a static email
            role: "admin",
            displayName: "Admin",
          });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoadingAuth(false);
    });

    // 3. Sync server user data with client
    if (isAuthenticated && serverUser) {
      setUser(prevUser => ({
        ...prevUser,
        ...serverUser,
      }));
    }

    // Clean up the auth listener
    return () => unsubscribe();
  }, [isAuthenticated, serverUser]);

  const value = { user, isAuthenticated, isLoadingAuth };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

