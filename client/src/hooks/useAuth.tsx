// client/src/hooks/useAuth.tsx

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User as FirebaseUser, getRedirectResult, GoogleAuthProvider } from "firebase/auth"; // getRedirectResult को इम्पोर्ट करें
import { app } from "@/lib/firebase";
import axios from "axios";

// User interface with roles
interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: "customer" | "seller" | "admin" | "delivery" | "approved-seller" | "not-approved-seller" | null;
  seller?: any; // Add seller info for seller users
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

const auth = getAuth(app);

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true, // Start loading as we're checking auth state
  });

  useEffect(() => {
    // 1. Handle redirect result first
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User signed in with redirect
          console.log("✅ useAuth: Google Redirect result found!", result.user);
          // Now proceed to fetch user details and role
          await fetchUserDetails(result.user);
        } else {
          console.log("🟠 useAuth: No redirect result found. Setting up onAuthStateChanged listener.");
          // If no redirect result, proceed with onAuthStateChanged listener
          // This also covers initial load when user is already signed in (e.g., direct access)
          onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              console.log("🟢 useAuth: User detected by onAuthStateChanged:", firebaseUser.uid);
              await fetchUserDetails(firebaseUser);
            } else {
              console.log("🔴 useAuth: No user detected by onAuthStateChanged. Setting user to null.");
              setAuthState({ user: null, loading: false });
            }
          });
        }
      } catch (error: any) {
        console.error("❌ useAuth: Error getting redirect result or during onAuthStateChanged:", error);
        // Handle specific errors for getRedirectResult if needed
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          console.warn("User cancelled sign-in flow.");
        } else if (error.code === 'auth/auth-domain-config-error' || error.code === 'auth/unauthorized-domain') {
          console.error("Firebase Auth Domain Configuration Error: Check Firebase Console 'Authorized Domains'.");
        }
        setAuthState({ user: null, loading: false });
      }
    };

    handleRedirectResult();

    // Cleanup listener on unmount (if onAuthStateChanged was set up)
    // Note: getRedirectResult is one-time, so no specific cleanup for it
    return () => {
      // If onAuthStateChanged was set up, it will be cleaned up
      // by subsequent calls or component unmount.
      // For onAuthStateChanged, you can store the unsubscribe function
      // and call it here if needed, but for typical app lifecycle, it's often fine.
    };

  }, []); // Run only once on mount

  const fetchUserDetails = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();

      // Attempt to get user details from your backend
      const [authMeRes, sellerMeRes] = await Promise.allSettled([
        axios.get("/api/auth/me", { headers: { Authorization: `Bearer ${idToken}` } }),
        axios.get("/api/sellers/me", { headers: { Authorization: `Bearer ${idToken}` } })
      ]);

      let userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName: firebaseUser.displayName?.split(" ")[0] || "",
        lastName: firebaseUser.displayName?.split(" ")[1] || "",
        role: "customer", // Default role
      };

      if (authMeRes.status === "fulfilled" && authMeRes.value.data) {
        // Assume /api/auth/me gives generic user info and possibly a base role
        // For simplicity, using firebaseUser info directly for customer for now
        // If your /api/auth/me provides specific roles/details, use them here.
      } else if (authMeRes.status === "rejected") {
          console.warn("/api/auth/me call failed:", authMeRes.reason);
          // If /api/auth/me fails, we can still proceed with Firebase user but role might be default.
      }


      if (sellerMeRes.status === "fulfilled" && sellerMeRes.value.data) {
        userData.seller = sellerMeRes.value.data;
        userData.role = sellerMeRes.value.data.approvalStatus === "approved" ? "approved-seller" : "not-approved-seller";
        console.log("💚 useAuth: Seller info fetched, role:", userData.role);
      } else if (sellerMeRes.status === "rejected") {
          console.log("🧡 useAuth: /api/sellers/me failed or no seller found for user (expected for non-sellers):", sellerMeRes.reason);
          // If seller API fails, it's fine for non-sellers, keep default customer role.
      }

      setAuthState({ user: userData, loading: false });
      console.log("🔵 useAuth: User state updated:", userData.role);

    } catch (error) {
      console.error("❌ useAuth: Error fetching user details from backend:", error);
      setAuthState({ user: null, loading: false }); // Fallback to null user on backend fetch error
    }
  };

  return authState;
};

      
