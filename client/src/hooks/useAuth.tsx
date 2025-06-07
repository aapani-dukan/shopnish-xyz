import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { app } from "@/lib/firebase"; // Firebase initialization file

interface User {
  uid: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  photoURL?: string | null;
  provider?: any[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();

        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user data");

        const data = await response.json();
        setUser({
          uid: data.uid,
          name: data.name,
          email: data.email,
          phone: data.phone,
          photoURL: data.photoURL,
          provider: data.provider,
        });
      } catch (err) {
        console.error("Auth Error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup
  }, []);

  return { user, loading };
}
