// src/hooks/useAuth.ts

import { useState, useEffect } from "react";
import { User } from "firebase/auth"; // Import User type
import {
  listenForAuthChanges,
  getRedirectUserResult,
  firebaseSignOut,
} from "@/lib/firebase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    // Handle potential redirect result first
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectUserResult();
        if (isMounted && result?.user) {
          setUser(result.user);
          // setLoading(false); // We'll let the listener handle final loading state
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error during redirect result:", error);
          // Optional: Force sign out on redirect error
          firebaseSignOut();
        }
      } finally {
        // This ensures that after redirect attempt, the listener takes over.
        // We set loading to false via the listener below.
      }
    };

    handleRedirectResult();

    // Listen for auth state changes (this runs immediately and then on changes)
    const unsubscribe = listenForAuthChanges((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setLoading(false); // Set loading to false once initial auth state is known
      }
    });

    // Cleanup function: unsubscribe from auth listener and set isMounted to false
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount

  return {
    user,
    isAuthenticated: !!user, // Convert user object to boolean (true if user exists)
    isLoading: loading,
  };
}
