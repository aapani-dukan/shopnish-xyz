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
  role?: "seller" | "customer" | "admin" | "delivery";
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        const idToken = await firebaseUser.getIdToken();

        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) throw new Error("Failed to fetch user data");
        const dataUser = await responseUser.json();

        const loginRole = sessionStorage.getItem("loginRole"); // ✅ sessionStorage का इस्तेमाल
        let sellerData: Seller | null = null;
        let role: User["role"] = loginRole === "seller" ? "seller" : (dataUser.role || "customer");

        if (role === "seller") {
          const responseSeller = await fetch("/api/sellers/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
          });

          if (responseSeller.ok) {
            sellerData = await responseSeller.json();
          }
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

        setUser(finalUser);

        // ✅ Role-based redirect
        if (typeof window !== "undefined") {
          if (role === "seller") {
            if (sellerData?.approvalStatus === "approved") {
              window.location.replace("/seller-dashboard");
            } else {
              window.location.replace("/register-seller");
            }
          } else {
            window.location.replace("/");
          }
        }

        return true;
      } catch (err) {
        console.error("Auth Error:", err);
        setUser(null);
        return false;
      } finally {
        setLoading(false);
      }
    };

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          fetchUserAndSeller(result.user);
        } else {
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              fetchUserAndSeller(firebaseUser);
            } else {
              setUser(null);
              setLoading(false);
            }
          });
          return () => unsubscribe();
        }
      })
      .catch((error) => {
        console.error("Redirect error:", error);
        setUser(null);
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
