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
  role?: "approved-seller" | "not-approved-seller" | "admin" | "delivery" | null; 
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
          // यदि यूजर डेटा फेच नहीं हो पाता, तो एरर लॉग करें लेकिन यूजर को null न करें
          // यह सुनिश्चित करने के लिए कि कम से कम Firebase Auth यूजर ऑब्जेक्ट सेट हो
          console.error(`useAuth: Failed to fetch user data: ${responseUser.statusText}`);
          // throw new Error(`Failed to fetch user data: ${responseUser.statusText}`); // यह throw हटा दें
        }
        const dataUser = responseUser.ok ? await responseUser.json() : null; // यदि सफल नहीं तो null

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
            role = "not-approved-seller";
          }
          console.log("useAuth: Seller data fetched, role:", role);
        } else if (responseSeller.status === 404) {
            console.log("useAuth: No seller profile found for this user (404).");
            // role null रहेगा
        } else {
            console.error("useAuth: Failed to fetch seller data:", responseSeller.status, responseSeller.statusText);
            // role null रहेगा
        }
        
        const finalUser: User = {
          uid: firebaseUser.uid, // FirebaseUser से UID लें
          name: dataUser?.name || firebaseUser.displayName, // या डेटा से या Firebase से
          email: dataUser?.email || firebaseUser.email,
          phone: dataUser?.phone || firebaseUser.phoneNumber,
          photoURL: dataUser?.photoURL || firebaseUser.photoURL,
          provider: dataUser?.provider || firebaseUser.providerData,
          role, 
          seller: sellerData,
        };

        setUser(finalUser);
        console.log("useAuth: User state updated:", finalUser);

      } catch (err) {
        console.error("useAuth: Auth Error during data fetch (catch block):", err);
        // यहां भी सुनिश्चित करें कि setLoading(false) चले
        setUser(null); // यदि कोई बड़ी एरर हो तो यूजर को नल कर दें
      } finally {
        // यह सुनिश्चित करता है कि डेटा फेच होने के बाद या एरर होने पर लोडिंग बंद हो जाए
        setLoading(false); 
      }
    };

    // Firebase ऑथेंटिकेशन स्टेट को हैंडल करने का मुख्य लॉजिक
    const handleAuthState = async () => {
      try {
        // 1. पहले getRedirectResult को चेक करें
        const redirectResult = await getRedirectResult(auth);
        
        if (redirectResult?.user) {
          console.log("useAuth: getRedirectResult found a user. Proceeding to fetch data.");
          await fetchUserAndSeller(redirectResult.user);
        } else {
          // 2. यदि कोई रीडायरेक्ट परिणाम नहीं है, तो onAuthStateChanged लिसनर सेट करें
          console.log("useAuth: No redirect result found. Setting up onAuthStateChanged listener.");
          unsubscribeFromAuthStateChanged = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              console.log("useAuth: onAuthStateChanged detected a user. Proceeding to fetch data.");
              await fetchUserAndSeller(firebaseUser);
            } else {
              console.log("useAuth: No user detected by onAuthStateChanged. Setting user to null.");
              setUser(null);
              setLoading(false); // यदि कोई यूजर नहीं है, तो लोडिंग बंद करें
            }
          });
        }
      } catch (error) {
        console.error("useAuth: Error in handleAuthState (main logic):", error);
        setUser(null);
      } finally {
        // यह सुनिश्चित करता है कि लोडिंग बंद हो जाए, भले ही कोई एरर हो
        // यह `fetchUserAndSeller` के `finally` ब्लॉक को डुप्लिकेट नहीं करेगा,
        // बल्कि यह शुरुआती लोडिंग के लिए एक सुरक्षा जाल है।
        if (user === null) { // अगर user अभी भी null है तो setLoading(false) करें
             setLoading(false);
        }
      }
    };

    handleAuthState(); // फंक्शन को कॉल करें

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
