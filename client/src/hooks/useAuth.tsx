// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase"; 
import { apiRequest } from "@/lib/queryClient"; 
import { User } from "@shared/backend/schema"; // आपकी User Zod स्कीमा

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null; // यह अब backendUser को स्टोर करेगा, जिसमें 'uuid' होगी
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null); // यह 'user' स्टेट अब 'User' स्कीमा टाइप की होगी
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      console.log("Auth State Changed. Firebase User:", fbUser);

      if (fbUser) {
        console.log("Firebase user detected. Preparing data for backend API.");
        try {
          const userData = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
          };
          console.log("UserData prepared for /api/auth/login:", userData);

          // API कॉल, रिस्पॉन्स सीधा डेटा ऑब्जेक्ट है
          const backendUser = await apiRequest("POST", "/api/auth/login", userData); 
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser); 
          // ✅ यहाँ सुनिश्चित करें कि backendUser में 'uuid' है
          // अगर backendUser.uuid undefined आता है, तो यहाँ console.error करें
          if (!backendUser || typeof backendUser.uuid === 'undefined') {
              console.error("Backend user received does not have a 'uuid' property:", backendUser);
              throw new Error("Invalid user data from backend: Missing UUID.");
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

  // isAuthenticated को 'user' ऑब्जेक्ट की उपस्थिति और उसमें 'uuid' होने से निर्धारित करें
  const isAuthenticated = !!user && typeof user.uuid === 'string'; // ✅ यहाँ 'uuid' का उपयोग करें

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
