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
  provider?: any[];
  seller?: Seller | null;
  role?: "approved-seller" | "not-approved-seller" | null;
}

export function useAuth() { // ✅ ध्यान दें: यह function export की जा रही है
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

        if (!responseUser.ok) {
          throw new Error("Failed to fetch user data");
        }

        const dataUser = await responseUser.json();

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
          if (sellerData.approvalStatus === "approved") {
            role = "approved-seller";
          } else {
            role = "not-approved-seller";
          }
        } else {
          role = null; // If no seller data, this user is not a seller. Role remains null.
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
      } catch (err) {
        console.error("Auth Error:", err);
        setUser(null);
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
