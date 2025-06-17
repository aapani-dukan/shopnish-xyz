import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";

type DeliveryUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  approvalStatus: "approved" | "pending" | "rejected";
  // ज़रूरत हो तो यहाँ extra फ़ील्ड जोड़ें
};

export function useDeliveryBoy() {
  const [deliveryUser, setDeliveryUser] = useState<DeliveryUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setDeliveryUser(null);
        setLoading(false);
        return;
      }

      /* 
       * 👉 यहां आप अपनी API call करें (या Firestore/Database) 
       *    जिससे delivery boy की profile और approvalStatus लाएँ। 
       *    फिलहाल demo के लिए मान लेते हैं कि सब approved हैं।
       */
      const demoProfile: DeliveryUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        approvalStatus: "approved",      // या "pending" / "rejected"
      };

      setDeliveryUser(demoProfile);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return {
    isDeliveryBoy: !!deliveryUser,
    deliveryUser,
    isLoading: loading,
  };
}
