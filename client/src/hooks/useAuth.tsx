// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase"; // handleRedirectResult का उपयोग नहीं किया गया है, लेकिन इम्पोर्टेड है
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
      console.log("Auth State Changed. Firebase User:", fbUser ? fbUser.uid : "None");

      if (fbUser) {
        console.log("Firebase user detected. Preparing data for backend API.");
        try {
          const token = await fbUser.getIdToken(); // Firebase ID टोकन प्राप्त करें
          const userData = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
            // फोन नंबर आदि जैसे अन्य डेटा भी यहां जोड़े जा सकते हैं यदि आवश्यक हो
          };
          console.log("UserData prepared for /api/auth/login:", userData);

          // API कॉल। apiRequest फंक्शन Authorization हेडर को हैंडल करेगा।
          const backendUser = await apiRequest("POST", "/api/auth/login", userData);
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser); 

          // ✅ यहाँ महत्वपूर्ण जांच: सुनिश्चित करें कि backendUser में 'uuid' है
          // यह जांच 'User UUID missing from backend response!' एरर को फ्रंटएंड पर बढ़ने से रोकेगी
          // और इसे यहाँ पकड़ने में मदद करेगी।
          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null) {
              console.error("Backend user received does not have a 'uuid' property or it's null/undefined:", backendUser);
              throw new Error("Invalid user data from backend: Missing or invalid UUID.");
          }
          
          setUser(backendUser); 
          console.log("User data set in context:", backendUser); 

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          setUser(null); // यदि कोई एरर हो तो यूजर को नल सेट करें
        }
      } else {
        console.log("No Firebase user detected. Setting user to null.");
        setUser(null);
      }

      setIsLoadingAuth(false); 
      console.log("Auth loading set to false.");
    });

    return unsubscribe;
  }, []); // कोई डिपेंडेंसी नहीं क्योंकि यह केवल माउंट पर एक बार चलता है और Firebase Auth स्टेट को लिसन करता है

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null); // यूज़र स्टेट क्लियर करें
      setFirebaseUser(null); // Firebase यूज़र स्टेट क्लियर करें
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // isAuthenticated को 'user' ऑब्जेक्ट की उपस्थिति और उसमें 'uuid' होने से निर्धारित करें
  const isAuthenticated = !!user && typeof user.uuid === 'string'; // ✅ 'uuid' प्रॉपर्टी की उपस्थिति और प्रकार जांचें

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
