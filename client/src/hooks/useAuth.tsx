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
  // अन्य seller fields यहाँ जोड़ सकते हैं
}

interface User {
  uid: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  photoURL?: string | null;
  provider?: any[];
  seller?: Seller | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        const idToken = await firebaseUser.getIdToken();

        // Step 1: User data
        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) throw new Error("Failed to fetch user data");
        const dataUser = await responseUser.json();

        // Step 2: Seller data
        let sellerData = null;
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

        setUser({
          uid: dataUser.uid,
          name: dataUser.name,
          email: dataUser.email,
          phone: dataUser.phone,
          photoURL: dataUser.photoURL,
          provider: dataUser.provider,
          seller: sellerData,
        });
      } catch (err) {
        console.error("Auth Error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // ✅ Handle redirect result first
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
