// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleGoogleRedirectResult } from "@/lib/firebase"; // ✅ handleGoogleRedirectResult को इम्पोर्ट करें
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/shared/types/user";

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
      console.log("User signed out successfully.");
      localStorage.removeItem('redirectIntent'); 
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  // ✅ नया useEffect: Google रीडायरेक्ट परिणाम को हैंडल करने के लिए
  useEffect(() => {
    console.log("Auth Provider: Running useEffect for Google Redirect Result.");
    const processRedirectResult = async () => {
      try {
        const result = await handleGoogleRedirectResult();
        if (result) {
          console.log("Auth Provider: Google redirect result found and processed. User:", result.user?.uid);
          // onAuthStateChanged listener अब इस यूजर को पिक करेगा।
          // हमें यहां explicit state सेट करने की आवश्यकता नहीं होनी चाहिए
          // क्योंकि onAuthStateChanged को ही इसे मैनेज करना चाहिए।
        } else {
          console.log("Auth Provider: No Google redirect result found.");
        }
      } catch (error) {
        console.error("Auth Provider: Error processing Google redirect result:", error);
      } finally {
        // भले ही कोई परिणाम न हो या कोई एरर हो, सुनिश्चित करें कि लोडिंग बंद हो जाए
        // setIsLoadingAuth(false); // इसे onAuthStateChanged में रहने दें
      }
    };

    // इसे केवल एक बार चलाएं जब कंपोनेंट माउंट हो।
    // यह Firebase को Google से रीडायरेक्ट के बाद लॉगिन को अंतिम रूप देने का मौका देता है।
    processRedirectResult();
  }, []); // खाली डिपेंडेंसी एरे

  // Firebase Auth State Listener (यह अभी भी मुख्य ऑथेंटिकेशन फ्लो है)
  useEffect(() => {
    console.log("Auth Provider: Running useEffect for onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("onAuthStateChanged listener fired. fbUser:", fbUser ? fbUser.uid : "null");
      setFirebaseUser(fbUser);

      if (fbUser) {
        console.log("Auth State Changed: Firebase user detected. UID:", fbUser.uid);
        try {
          const idToken = await fbUser.getIdToken();
          console.log("Firebase ID Token obtained. Length:", idToken.length);

          const userDataForLogin = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
          };
          console.log("UserData prepared for /api/auth/login:", userDataForLogin);

          const backendUser: User = await apiRequest("POST", "/api/auth/login", userDataForLogin);
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null || typeof backendUser.role === 'undefined') {
              console.error("Backend user received does not have required properties (uuid/role) or they are null/undefined:", backendUser);
              await signOut(); 
              return;
          }

          const fullUser: User = {
              ...backendUser,
              firebaseUid: fbUser.uid,
              idToken: idToken,
          };

          setUser(fullUser);
          console.log("User data (including idToken) set in context:", fullUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          await signOut();
        }
      } else {
        console.log("Auth State Changed: No Firebase user detected. Setting user to null.");
        setUser(null);
        // यहां handleGoogleRedirectResult को कॉल न करें, यह अब ऊपर वाले अलग useEffect में है।
      }

      setIsLoadingAuth(false);
      console.log("Auth loading set to false.");
    });

    return unsubscribe;
  }, [signOut]);

  const isAuthenticated = !!user && typeof user.uuid === 'string' && !!user.idToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        isAuthenticated,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
