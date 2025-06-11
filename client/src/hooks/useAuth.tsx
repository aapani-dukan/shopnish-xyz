// client/src/hooks/useAuth.tsx
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { firebaseOnAuthStateChanged, handleGoogleRedirectResult, firebaseSignOut } from "@/lib/firebase"; // नए एक्सपोर्ट्स को इम्पोर्ट करें
import type { User as FirebaseUser } from "firebase/auth"; // FirebaseUser टाइप इम्पोर्ट करें
import axios from "axios"; // axios का उपयोग करें

interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: "customer" | "seller" | "admin" | "delivery" | "approved-seller" | "not-approved-seller" | null;
  // `seller` property is managed by useSeller hook, not here directly
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    // 1. Firebase रीडायरेक्ट परिणाम को संभालें (पहली बार पेज लोड होने पर)
    const processRedirectAndListen = async () => {
      try {
        const result = await handleGoogleRedirectResult(); // Firebase से रीडायरेक्ट परिणाम प्राप्त करें
        if (result) {
          // यदि रीडायरेक्ट परिणाम है, तो उपयोगकर्ता को Firebase से सेट करें
          setFirebaseUser(result.user);
          console.log("✅ useAuth: Google Redirect result processed!");
          // तुरंत बैकएंड डेटा को इनवैलिडेट करें ताकि यह नया डेटा फेच करे
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (error) {
        console.error("❌ useAuth: Error processing Google Redirect result:", error);
        // यहां त्रुटि हैंडलिंग करें, जैसे उपयोगकर्ता को लॉगआउट करना या त्रुटि संदेश दिखाना
        firebaseSignOut(); // त्रुटि पर लॉगआउट करना उचित हो सकता है
      } finally {
        // 2. onAuthStateChanged लिसनर को सेट करें
        // यह सुनिश्चित करता है कि Firebase ऑथ स्टेट में किसी भी बदलाव को पकड़ा जाए (लॉगिन/लॉगआउट/टोकन रिफ्रेश)
        const unsubscribe = firebaseOnAuthStateChanged((user) => {
          setFirebaseUser(user);
          setIsFirebaseLoading(false); // Firebase लोडिंग समाप्त
          // जब Firebase ऑथ स्टेट बदलता है, तो backend user query को इनवैलिडेट करें
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); 
          console.log("🔥 Firebase onAuthStateChanged: User changed to", user ? user.uid : "null");
        });
        return () => unsubscribe(); // कॉम्पोनेंट अनमाउंट होने पर लिसनर को क्लीनअप करें
      }
    };

    processRedirectAndListen();
  }, [queryClient]); // queryClient dependencies array में है

  // React Query का उपयोग करके अपने बैकएंड से उपयोगकर्ता विवरण प्राप्त करें
  const { data: backendUser, isLoading: isBackendLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      if (!firebaseUser) {
        // यदि कोई Firebase उपयोगकर्ता नहीं है, तो backend fetch करने का प्रयास न करें
        return Promise.reject(new Error("No Firebase user found for backend fetch."));
      }
      const idToken = await firebaseUser.getIdToken();
      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      // ✅ सुनिश्चित करें कि आपका backend JSON ऑब्जेक्ट के साथ user data लौटाता है
      return response.data; 
    },
    // इस क्वेरी को केवल तभी सक्षम करें जब Firebase उपयोगकर्ता मौजूद हो और Firebase लोडिंग समाप्त हो
    enabled: !!firebaseUser && !isFirebaseLoading, 
    retry: false, // ऑथेंटिकेशन मुद्दों पर फिर से प्रयास न करें
    staleTime: 5 * 60 * 1000, // डेटा को 5 मिनट के लिए ताजा मानें
    // यदि backend fetch विफल रहता है (जैसे 401 Unauthorized), तो Firebase उपयोगकर्ता को लॉगआउट करें
    onError: (error) => {
      console.error("❌ useAuth: Error fetching user data from backend:", error);
      // यदि यह 401 या 403 है, तो Firebase सत्र को भी साफ़ करें
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        firebaseSignOut();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // क्वेरी को साफ़ करें
      }
    }
  });

  // कुल लोडिंग स्थिति
  const isLoading = isFirebaseLoading || isBackendLoading;

  // FirebaseUser और backendUser डेटा को संयोजित करें
  const combinedUser: User | null = firebaseUser && backendUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    firstName: firebaseUser.displayName?.split(" ")[0] || backendUser.firstName || "",
    lastName: firebaseUser.displayName?.split(" ")[1] || backendUser.lastName || "",
    role: backendUser.role, // बैकएंड से भूमिका लें
    // अन्य फ़ील्ड यदि आवश्यक हो तो जोड़ें
  } : null;

  return {
    user: combinedUser,
    isLoading,
    isAuthenticated: !!combinedUser && !isLoading, // केवल तभी प्रमाणित जब उपयोगकर्ता डेटा उपलब्ध हो और लोडिंग समाप्त हो
  };
};
