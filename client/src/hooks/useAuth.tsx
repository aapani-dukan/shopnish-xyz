// src/hooks/useAuth.ts
import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase"; 
import { apiRequest } from "@/lib/queryClient"; 
import { User } from "@shared/backend/schema"; // सुनिश्चित करें कि यह User टाइप सही है

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isLoadingAuth: boolean; // ✅ 'loading' को 'isLoadingAuth' में बदला गया
  isAuthenticated: boolean; // ✅ isAuthenticated प्रॉपर्टी जोड़ी गई
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // ✅ शुरुआत में true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => { // 'firebaseUser' को 'fbUser' नाम दिया गया ताकि अंदर 'firebaseUser' वेरिएबल से भ्रम न हो
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

          // ✅ यहाँ बदलाव: apiRequest का रिस्पॉन्स सीधे डेटा होता है, .json() नहीं
          const backendUser = await apiRequest("POST", "/api/auth/login", userData); 
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser); 
          setUser(backendUser); // सीधे backendUser को सेट करें
          console.log("User data set in context:", backendUser); 
        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          setUser(null); // यदि एरर है, तो यूजर को null सेट करें
        }
      } else {
        console.log("No Firebase user detected. Setting user to null.");
        setUser(null);
      }

      setIsLoadingAuth(false); // ✅ जब ऑथेंटिकेशन प्रोसेस पूरा हो जाए तो false करें
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

  // isAuthenticated को user ऑब्जेक्ट की उपस्थिति से निर्धारित करें
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        isLoadingAuth,
        isAuthenticated, // ✅ isAuthenticated प्रदान करें
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
