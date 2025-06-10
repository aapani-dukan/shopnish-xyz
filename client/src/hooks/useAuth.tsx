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
  provider?: any[];
  seller?: Seller | null;
  // Role now only for sellers: "approved" or "not-approved"
  role?: "approved-seller" | "not-approved-seller" | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        console.log("✅ Firebase user detected:", firebaseUser);

        const idToken = await firebaseUser.getIdToken();

        // Fetch general user data
        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) throw new Error("❌ Failed to fetch user data");

        const dataUser = await responseUser.json();
        console.log("✅ /api/auth/me response:", dataUser);

        // Check loginRole from sessionStorage - only "seller" handled here
        const loginRole = sessionStorage.getItem("loginRole");
        if (loginRole !== "seller") {
          // If not seller, set user null or handle as per your app logic
          console.warn("⚠️ User is not seller via loginRole, ignoring user.");
          setUser(null);
          return false;
        }

        // Seller flow: fetch seller data to determine approval status
        let sellerData: Seller | null = null;
        let role: User["role"] = null;

        const responseSeller = await fetch("/api/sellers/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (responseSeller.ok) {
          sellerData = await responseSeller.json();
          console.log("✅ /api/sellers/me response:", sellerData);

          // Set role based on approvalStatus
          if (sellerData.approvalStatus === "approved") {
            role = "approved-seller";
          } else {
            role = "not-approved-seller";
          }
        } else {
          console.warn("⚠️ Failed to fetch seller data");
          role = "not-approved-seller"; // default to not approved if error
        }

        const finalUser: User = {
          uid: dataUser.uid,
          name: dataUser.name,
          email: dataUser.email,
          phone: dataUser.phone,
          photoURL: dataUser.photoURL,
          provider: dataUser.provider,
          role,
          seller: sellerData,
        };

        console.log("✅ Final user set to:", finalUser);
        setUser(finalUser);
        return true;
      } catch (err) {
        console.error("❌ Auth Error:", err);
        setUser(null);
        return false;
      } finally {
        setLoading(false);
      }
    };

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("➡️ Firebase redirect login success");
          fetchUserAndSeller(result.user);
        } else {
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              console.log("📡 Auth state changed - user logged in");
              fetchUserAndSeller(firebaseUser);
            } else {
              console.log("🚫 No user found in auth state");
              setUser(null);
              setLoading(false);
            }
          });
          return () => unsubscribe();
        }
      })
      .catch((error) => {
        console.error("❌ Redirect error:", error);
        setUser(null);
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
