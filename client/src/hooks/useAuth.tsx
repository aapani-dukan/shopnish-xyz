// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase";
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
          const userData = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
          };
          console.log("UserData prepared for /api/auth/login:", userData);

          // ✅ यहाँ मुख्य बदलाव: apiRequest से प्राप्त Response ऑब्जेक्ट पर .json() कॉल करें
          const apiResponseObject = await apiRequest("POST", "/api/auth/login", userData);
          const { user: backendUser } = await apiResponseObject.json(); // <-- यह बदलाव है!

          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null) {
              console.error("Backend user received does not have a 'uuid' property or it's null/undefined:", backendUser);
              throw new Error("Invalid user data from backend: Missing or invalid UUID.");
          }

          setUser(backendUser);
          console.log("User data set in context:", backendUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
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
