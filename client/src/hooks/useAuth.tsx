/* client/src/hooks/useAuth.tsx
   -------------------------------------------------- */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  firebaseOnAuthStateChanged,
  handleGoogleRedirectResult,
  firebaseSignOut,
} from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import axios from "axios";

/* ---------- local types ---------- */
interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?:
    | "customer"
    | "seller"
    | "admin"
    | "delivery"
    | "approved-seller"
    | "not-approved-seller"
    | null;
}

/* ==================================================
   ✅  *Named* export — यही Rollup को चाहिए
   ================================================== */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  /* --------------------- Firebase listeners --------------------- */
  useEffect(() => {
    let unsubscribe: () => void;

    /* हम async logic को IIFE में रखते हैं */
    (async () => {
      /* 1️⃣  Google-redirect result */
      try {
        const result = await handleGoogleRedirectResult();
        if (result) {
          setFirebaseUser(result.user);
          console.log("✅ Google Redirect processed");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (err) {
        console.error("❌ Redirect error:", err);
        firebaseSignOut();
      }

      /* 2️⃣  onAuthStateChanged – हमेशा चलाएं */
      unsubscribe = firebaseOnAuthStateChanged(async user => {
        console.log("🔥 onAuthStateChanged:", user?.uid ?? "null");
        setFirebaseUser(user);
        setIsFirebaseLoading(false);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      });
    })();

    /* cleanup */
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [queryClient]);

  /* --------------------- backend /api/auth/me ------------------- */
  const {
    data: backendUser,
    isLoading: isBackendLoading,
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!firebaseUser && !isFirebaseLoading,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!firebaseUser) throw new Error("No Firebase user");
      const idToken = await firebaseUser.getIdToken();

      console.log(
        "↪️  Calling /api/auth/me with token",
        idToken.slice(0, 12),
        "…"
      );

      const { data } = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      return data;
    },
    onError: err => {
      console.error("❌ Backend /auth/me error:", err);
      if (
        axios.isAxiosError(err) &&
        [401, 403].includes(err.response?.status ?? 0)
      ) {
        firebaseSignOut();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });

  /* --------------------- combined result ------------------------ */
  const isLoading = isFirebaseLoading || isBackendLoading;

  const combinedUser: User | null =
    firebaseUser && backendUser
      ? {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName:
            firebaseUser.displayName?.split(" ")[0] || backendUser.firstName,
          lastName:
            firebaseUser.displayName?.split(" ")[1] || backendUser.lastName,
          role: backendUser.role,
        }
      : null;

  return {
    user: combinedUser,
    isLoading,
    isInitialized: !isFirebaseLoading,
    isAuthenticated: !!combinedUser && !isLoading,
  };
};
/* -------------------------------------------------- */
