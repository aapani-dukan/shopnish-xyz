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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);

    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        // Firebase यूजर का आईडी टोकन प्राप्त करें
        const idToken = await firebaseUser.getIdToken();

        // सामान्य यूजर डेटा प्राप्त करें
        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) {
          // यदि यूजर डेटा प्राप्त करने में विफल रहता है, तो एरर थ्रो करें
          throw new Error("Failed to fetch user data");
        }

        const dataUser = await responseUser.json();

        // सेलर डेटा प्राप्त करें
        let sellerData: Seller | null = null;
        let role: User["role"] = null;

        const responseSeller = await fetch("/api/sellers/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        // यदि सेलर डेटा सफलतापूर्वक प्राप्त होता है
        if (responseSeller.ok) {
          sellerData = await responseSeller.json();
          // अप्रूवल स्टेटस के आधार पर रोल सेट करें
          if (sellerData.approvalStatus === "approved") {
            role = "approved-seller";
          } else {
            role = "not-approved-seller";
          }
        } else {
          // यदि सेलर डेटा प्राप्त करने में विफल रहता है, तो यह यूजर सेलर नहीं है
          // रोल को null पर सेट करें (यह सामान्य यूजर है)
          role = null;
        }

        // फाइनल यूजर ऑब्जेक्ट बनाएं
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
        // किसी भी एरर पर यूजर को null पर सेट करें
        console.error("Auth Error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Firebase रीडायरेक्ट लॉगिन परिणाम को हैंडल करें
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // यदि रीडायरेक्ट लॉगिन सफल होता है, तो यूजर और सेलर डेटा प्राप्त करें
          fetchUserAndSeller(result.user);
        } else {
          // यदि कोई रीडायरेक्ट परिणाम नहीं है, तो सामान्य ऑथेंटिकेशन स्थिति परिवर्तनों को सुनें
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              // यदि यूजर लॉग इन है, तो यूजर और सेलर डेटा प्राप्त करें
              fetchUserAndSeller(firebaseUser);
            } else {
              // यदि कोई यूजर नहीं मिला, तो यूजर को null पर सेट करें
              setUser(null);
              setLoading(false);
            }
          });
          // जब कंपोनेंट अनमाउंट होता है तो लिसनर को अनसब्सक्राइब करें
          return () => unsubscribe();
        }
      })
      .catch((error) => {
        // रीडायरेक्ट एरर को हैंडल करें
        console.error("Redirect error:", error);
        setUser(null);
        setLoading(false);
      });
  }, []); // useEffect केवल एक बार कंपोनेंट माउंट होने पर चलता है

  return { user, loading };
}
