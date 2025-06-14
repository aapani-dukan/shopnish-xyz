import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  firebaseOnAuthStateChanged,
  handleGoogleRedirectResult,
  firebaseSignOut,
} from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import axios from "axios";

interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: "customer" | "seller" | "admin" | "delivery" | "approved-seller" | "not-approved-seller" | null;
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    const processRedirectAndListen = async () => {
      try {
        const result = await handleGoogleRedirectResult();
        if (result) {
          setFirebaseUser(result.user);
          console.log("✅ useAuth: Google Redirect result processed!");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (error) {
        console.error("❌ useAuth: Error processing Google Redirect result:", error);
        firebaseSignOut();
      } finally {
        const unsubscribe = firebaseOnAuthStateChanged((user) => {
          setFirebaseUser(user);
          setIsFirebaseLoading(false);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          console.log("🔥 Firebase onAuthStateChanged: User changed to", user ? user.uid : "null");
        });
        return () => unsubscribe();
      }
    };

    processRedirectAndListen();
  }, [queryClient]);

  const { data: backendUser, isLoading: isBackendLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!firebaseUser) {
        return Promise.reject(new Error("No Firebase user found for backend fetch."));
      }
      const idToken = await firebaseUser.getIdToken();
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      return response.data;
    },
    enabled: !!firebaseUser && !isFirebaseLoading,
    retry: false,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error("❌ useAuth: Error fetching user data from backend:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        firebaseSignOut();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });

  const isLoading = isFirebaseLoading || isBackendLoading;

  const combinedUser: User | null =
    firebaseUser && backendUser
      ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(" ")[0] || backendUser.firstName || "",
          lastName: firebaseUser.displayName?.split(" ")[1] || backendUser.lastName || "",
          role: backendUser.role,
        }
      : null;

  return {
    user: combinedUser,
    isLoading,
    isInitialized: !isFirebaseLoading, // ✅ नई लाइन जोड़ी गई
    isAuthenticated: !!combinedUser && !isLoading,
  };
};
