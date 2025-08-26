import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ✅ DeliveryUser के लिए टाइप अपडेट करें
type DeliveryUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  name: string;
  approvalStatus: "approved" | "pending" | "rejected";
  // ज़रूरत हो तो यहाँ extra फ़ील्ड जोड़ें
};

export function useDeliveryBoy() {
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ✅ Error state

  useEffect(() => {
    // ✅ auth ऑब्जेक्ट का सही उपयोग करें
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      setError(null);

      if (!firebaseUser) {
        setDeliveryUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        
        // ✅ API कॉल करें
        const res = await fetch("/api/delivery/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch user data.");
        }

        const data = await res.json();
        setDeliveryUser(data.user); // ✅ बैकएंड से मिला डेटा सेट करें

      } catch (err: any) {
        console.error("Failed to fetch delivery user:", err);
        setError(err.message);
        setDeliveryUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return {
    isDeliveryBoy: !!deliveryUser,
    deliveryUser,
    isLoading: loading,
    error, // ✅ Error state भी return करें
  };
}
