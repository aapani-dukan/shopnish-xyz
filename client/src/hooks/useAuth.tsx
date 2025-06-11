// client/src/hooks/useAuth.tsx

import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  getRedirectResult,
  User as FirebaseUser,
} from "firebase/auth";
import { app } from "@/lib/firebase";

interface Seller {
  id: number;
  userId: string;
  storeName: string;
  approvalStatus: "approved" | "pending" | "rejected";
  rejectionReason?: string;
}

interface User {
  uid: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  photoURL?: string | null;
  provider?: any[]; // Firebase Auth ProviderData
  seller?: Seller | null;
  role?: "approved-seller" | "not-approved-seller" | "admin" | "delivery" | null; // Added more roles for clarity
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    let unsubscribeFromAuthStateChanged: (() => void) | undefined;

    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        const idToken = await firebaseUser.getIdToken();
        console.log("useAuth: Fetching user and seller data for UID:", firebaseUser.uid);

        // Fetch user data
        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) {
          throw new Error(`Failed to fetch user data: ${responseUser.statusText}`);
        }
        const dataUser = await responseUser.json();

        let sellerData: Seller | null = null;
        let role: User["role"] = null;

        // Attempt to fetch seller data
        const responseSeller = await fetch("/api/sellers/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (responseSeller.ok) {
          sellerData = await responseSeller.json();
          if (sellerData.approvalStatus === "approved") {
            role = "approved-seller";
          } else {
            role = "not-approved-seller"; // या "seller" जैसा आप उपयोग करते हैं
          }
          console.log("useAuth: Seller data fetched, role:", role);
        } else if (responseSeller.status === 404) {
            console.log("useAuth: No seller profile found for this user.");
            role = null; // User is authenticated but not a seller.
        } else {
            console.error("useAuth: Failed to fetch seller data:", responseSeller.status, responseSeller.statusText);
            role = null; // Default to null if seller fetch fails for other reasons
        }
        
        // Note: Admin/Delivery roles would typically come from custom claims
        // or a separate API call. Assuming for now they are not handled here.
        // If your backend sets custom claims, you'd read them from firebaseUser.getIdTokenResult(true)

        const finalUser: User = {
          uid: dataUser.uid,
          name: dataUser.name,
          email: dataUser.email,
          phone: dataUser.phone,
          photoURL: dataUser.photoURL,
          provider: dataUser.provider,
          role, // This will be 'approved-seller', 'not-approved-seller', or null
          seller: sellerData,
        };

        setUser(finalUser);
        console.log("useAuth: User state updated:", finalUser);

      } catch (err) {
        console.error("useAuth: Auth Error during data fetch:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // 1. सबसे पहले getRedirectResult को चेक करें
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("useAuth: getRedirectResult found a user. Fetching details...");
          fetchUserAndSeller(result.user);
        } else {
          // 2. यदि कोई रीडायरेक्ट परिणाम नहीं है, तो onAuthStateChanged लिसनर सेट करें
          console.log("useAuth: No redirect result found. Setting up onAuthStateChanged listener.");
          unsubscribeFromAuthStateChanged = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              console.log("useAuth: onAuthStateChanged detected a user. Fetching details...");
              fetchUserAndSeller(firebaseUser);
            } else {
              console.log("useAuth: No user detected by onAuthStateChanged.");
              setUser(null);
              setLoading(false);
            }
          });
        }
      })
      .catch((error) => {
        console.error("useAuth: Error from getRedirectResult:", error);
        setUser(null);
        setLoading(false);
      });

    // Cleanup function
    return () => {
      if (unsubscribeFromAuthStateChanged) {
        console.log("useAuth: Cleaning up onAuthStateChanged listener.");
        unsubscribeFromAuthStateChanged();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return { user, loading };
}
