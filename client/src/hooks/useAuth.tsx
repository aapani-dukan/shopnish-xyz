// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/shared/types/user"; // ✅ इम्पोर्ट करें


interface AuthContextType {
  // firebaseUser को context में रखने की आवश्यकता नहीं है यदि इसकी जानकारी User ऑब्जेक्ट में है
  user: User | null; // ✅ Firebase UID और idToken अब इस User ऑब्जेक्ट में होगा
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  // signInWithGoogle: () => Promise<void>; // यदि आप इसे context से provide करना चाहते हैं
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // firebaseUser को आंतरिक रूप से ट्रैक करें लेकिन इसे सीधे context में expose न करें
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); 
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser); // FirebaseUser को आंतरिक रूप से सेट करें

      if (fbUser) {
        console.log("Auth State Changed: Firebase user detected. UID:", fbUser.uid);
        try {
          const idToken = await fbUser.getIdToken();
          console.log("Firebase ID Token obtained. Length:", idToken.length); // टोकन की लंबाई लॉग करें

          const userDataForLogin = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
            // idToken को सीधे यहां payload में भेजने की आवश्यकता नहीं है
            // क्योंकि apiRequest इसे Authorization header में खुद ही जोड़ देगा
          };
          console.log("UserData prepared for /api/auth/login:", userDataForLogin);

          // apiRequest अब सीधे T टाइप का डेटा लौटाता है (जो कि आपका User ऑब्जेक्ट है)
          const backendUser: User = await apiRequest("POST", "/api/auth/login", userDataForLogin);
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null) {
              console.error("Backend user received does not have a 'uuid' property or it's null/undefined:", backendUser);
              throw new Error("Invalid user data from backend: Missing or invalid UUID.");
          }

          // ✅ यहाँ सुधार: सुनिश्चित करें कि idToken को user ऑब्जेक्ट में जोड़ा गया है
          const fullUser: User = {
              ...backendUser,
              firebaseUid: fbUser.uid, // सुनिश्चित करें कि Firebase UID मौजूद है
              idToken: idToken, // ✅ idToken को user ऑब्जेक्ट में जोड़ें
          };

          setUser(fullUser); // ✅ अब यह एक ही ऑब्जेक्ट पास करेगा
          console.log("User data (including idToken) set in context:", fullUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          // यदि सर्वर लॉगिन विफल होता है तो Firebase से भी लॉगआउट करें
          await auth.signOut();
          setUser(null);
        }
      } else {
        console.log("Auth State Changed: No Firebase user detected. Setting user to null.");
        setUser(null);
      }

      setIsLoadingAuth(false);
      console.log("Auth loading set to false.");
    });

    return unsubscribe;
  }, []); // [] ही रखें, क्योंकि onAuthStateChanged लिसनर को सिर्फ एक बार सेट होना चाहिए

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // isAuthenticated की गणना user ऑब्जेक्ट पर आधारित होनी चाहिए और इसमें uuid भी शामिल होना चाहिए
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
