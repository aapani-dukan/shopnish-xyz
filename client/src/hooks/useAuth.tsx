// client/src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, getRedirectResult, signOut as firebaseSignOut } from "firebase/auth";
import axios from "axios";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        await getRedirectResult(auth); // capture login result
      } catch (err) {
        console.error("Redirect error:", err);
      }

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          try {
            const res = await axios.get("/api/sellers/me", {
              headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
            });
            setSeller(res.data.seller || null);
          } catch (err) {
            console.error("Seller fetch error", err);
            setSeller(null);
          }
        } else {
          setUser(null);
          setSeller(null);
        }
        setLoading(false);
      });
    };

    handleAuth();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setSeller(null);
  };

  return { user, seller, loading, signOut };
}
