// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient"; // आपका apiRequest
import { User } from "@shared/backend/schema"; // Ensure this User type matches your backend response

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

          // ✅ यहाँ बदलाव: apiRequest अब सीधे पार्स किया गया JSON लौटाता है।
          // इसलिए, apiResponseObject पर .json() कॉल करने की आवश्यकता नहीं है।
          const apiResponse: { user: User, token: string } = await apiRequest("POST", "/api/auth/login", userData);
          const { user: backendUser, token } = apiResponse; // ✅ सीधे apiResponse से user और token प्राप्त करें

          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null) {
              console.error("Backend user received does not have a 'uuid' property or it's null/undefined:", backendUser);
              throw new Error("Invalid user data from backend: Missing or invalid UUID.");
          }

          // ✅ JWT Token को localStorage में सेव करें
          if (token) {
              localStorage.setItem('authToken', token);
              console.log("Auth token saved to localStorage.");
          } else {
              console.warn("No auth token received from backend /api/auth/login.");
          }

          setUser(backendUser);
          console.log("User data set in context:", backendUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          setUser(null);
          localStorage.removeItem('authToken'); // एरर पर टोकन हटा दें
        }
      } else {
        console.log("No Firebase user detected. Setting user to null and clearing token.");
        setUser(null);
        localStorage.removeItem('authToken'); // यूजर साइन आउट पर टोकन हटा दें
      }

      setIsLoadingAuth(false);
      console.log("Auth loading set to false.");
    });

    // ✅ कंपोनेंट माउंट होने पर localStorage से टोकन और यूजर डेटा (यदि कोई हो) लोड करें
    // यह पेज रिफ्रेश पर 'isAuthenticated' स्थिति को बनाए रखने में मदद करेगा
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
        // आप यहां /api/me एंडपॉइंट को कॉल करके टोकन को वैलिडेट कर सकते हैं
        // और यूजर डेटा को फिर से फ़ेच कर सकते हैं ताकि सुनिश्चित हो सके कि यह अप-टू-डेट है।
        // अभी के लिए, हम बस मान लेते हैं कि टोकन वैध है और यूजर को लोडिंग के बाद ऑथेंटिकेटेड मान लेते हैं।
        // एक अधिक मजबूत समाधान में यहां एक `/api/me` कॉल शामिल होगा।
    } else {
        // यदि कोई टोकन नहीं है, तो लोडिंग को तुरंत समाप्त करें
        setIsLoadingAuth(false);
    }


    return unsubscribe;

  }, []); // Empty dependency array means this runs once on mount

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('authToken'); // साइन आउट पर टोकन हटा दें
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // ✅ isAuthenticated की जांच में localStorage में टोकन की उपस्थिति शामिल करें
  const isAuthenticated = !!user && typeof user.uuid === 'string' && !!localStorage.getItem('authToken');

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
