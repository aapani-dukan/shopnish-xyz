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
      localStorage.removeItem('redirectIntent'); // ✅ सुनिश्चित करें कि लॉगआउट पर इंटेंट भी हट जाए
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  useEffect(() => {
    // ✅ यह एक फ्लैग है यह ट्रैक करने के लिए कि क्या हमने इस सत्र में रीडायरेक्ट रिजल्ट को पहले ही प्रोसेस कर लिया है।
    // इससे onAuthStateChanged के मल्टीपल बार फायर होने पर डुप्लीकेट प्रोसेसिंग से बचा जा सकेगा।
    let redirectResultProcessed = false; 

    // Firebase Auth State Listener
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
        
        // ✅ महत्वपूर्ण: Google रीडायरेक्ट के बाद लॉगिन को पूरा करने के लिए यहाँ handleGoogleRedirectResult को कॉल करें।
        // इसे केवल तभी कॉल करें जब यह पहला लोड हो और अभी तक प्रोसेस न किया गया हो।
        if (!redirectResultProcessed) {
            console.log("Checking for Google redirect result...");
            try {
                const result = await handleGoogleRedirectResult(); // Call the function from firebase.ts
                if (result) {
                    console.log("Google redirect result processed. Firebase user should now be detected in next onAuthStateChanged fire.");
                    redirectResultProcessed = true; // इसे दोबारा प्रोसेस न करें
                    // onAuthStateChanged फिर से फायर होगा fbUser के साथ, और ऊपर का if (fbUser) ब्लॉक चलेगा।
                } else {
                    console.log("No Google redirect result found this time.");
                }
            } catch (error) {
                console.error("Error handling Google redirect result:", error);
            }
        }
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

// ✅ आप बाद में useSeller हुक दिखा सकते हैं, लेकिन पहले इस ऑथेंटिकेशन लूप को तोड़ना महत्वपूर्ण है।
