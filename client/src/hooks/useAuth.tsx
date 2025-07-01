// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase"; // handleRedirectResult की अब यहाँ सीधे जरूरत नहीं है, AuthProvider में ही हैंडल होगा
import { apiRequest } from "@/lib/queryClient"; // आपका apiRequest
import { User } from "@shared/backend/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      console.log("Auth State Changed. Firebase User:", fbUser ? fbUser.uid : "None");

      if (fbUser) {
        console.log("Firebase user detected. Preparing data for backend API.");
        try {
          // ✅ मुख्य बदलाव यहाँ है: Firebase ID Token प्राप्त करें
          const idToken = await fbUser.getIdToken();
          console.log("Firebase ID Token obtained.");

          const userDataForLogin = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
            idToken: idToken, // ✅ इसे यहाँ जोड़ा गया है!
          };
          console.log("UserData prepared for /api/auth/login:", userDataForLogin);

          // apiRequest फंक्शन को अपडेट किया गया है ताकि वह सही रिस्पोंस हैंडल कर सके
          const backendUserResponse = await apiRequest("POST", "/api/auth/login", userDataForLogin);

          // यदि आपका apiRequest सीधे JSON पार्स करके ऑब्जेक्ट देता है, तो .user को एक्सेस करें
          const backendUser = backendUserResponse.user; // यदि आपका सर्वर { user: UserData } भेजता है
          // यदि आपका सर्वर सीधे UserData ऑब्जेक्ट भेजता है, तो बस:
          // const backendUser = backendUserResponse;

          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null) {
              console.error("Backend user received does not have a 'uuid' property or it's null/undefined:", backendUser);
              throw new Error("Invalid user data from backend: Missing or invalid UUID.");
          }

          setUser(backendUser);
          console.log("User data set in context:", backendUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          // लॉगआउट करने का प्रयास करें यदि सर्वर लॉगिन विफल होता है
          await auth.signOut();
          setUser(null);
        }
      } else {
        console.log("No Firebase user detected. Setting user to null.");
        setUser(null);
      }

      setIsLoadingAuth(false);
      console.log("Auth loading set to false.");
    });

    return unsubscribe;
  }, []);

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

  const isAuthenticated = !!user && typeof user.uuid === 'string';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
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
