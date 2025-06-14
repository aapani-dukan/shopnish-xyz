import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  auth,
  getRedirectUser,
  listenAuth,
  firebaseSignOut,
} from "@/lib/firebase";
import type { User } from "firebase/auth";

export const useAuth = () => {
  const qc = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ capture redirect result (one‑time)
    getRedirectUser().finally(() => {
      // 2️⃣ *always* attach permanent listener
      const unsub = listenAuth((u) => {
        setFirebaseUser(u);
        setLoading(false);
      });
      return () => unsub();
    });
  }, []);

  return {
    user: firebaseUser,
    isLoading: loading,
    isAuthenticated: !!firebaseUser,
    logout: firebaseSignOut,
  };
};
