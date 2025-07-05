// src/hooks/useAuth.ts

import { createContext, useContext, useEffect, useState, useCallback } from "react"; // useCallback इम्पोर्ट करें
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/shared/types/user"; // ✅ इम्पोर्ट करें


interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // firebaseUser को आंतरिक रूप से ट्रैक करें लेकिन इसे सीधे context में expose न करें
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); 
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // signOut फंक्शन को useCallback में लपेटें ताकि अनावश्यक री-रेंडर से बचा जा सके
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null); // AuthProvider के स्टेट को भी साफ़ करें
      setFirebaseUser(null); // FirebaseUser को भी साफ़ करें
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []); // [] ही रखें क्योंकि यह किसी external dependency पर निर्भर नहीं करता

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser); // FirebaseUser को आंतरिक रूप से सेट करें

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

          // apiRequest अब सीधे T टाइप का डेटा लौटाता है (जो कि आपका User ऑब्जेक्ट है)
          const backendUser: User = await apiRequest("POST", "/api/auth/login", userDataForLogin);
          
          console.log("API request to /api/auth/login successful. Backend User received:", backendUser);

          // ✅ महत्वपूर्ण: backendUser से अपेक्षित गुणों की जांच करें
          if (!backendUser || typeof backendUser.uuid === 'undefined' || backendUser.uuid === null || typeof backendUser.role === 'undefined') {
              console.error("Backend user received does not have required properties (uuid/role) or they are null/undefined:", backendUser);
              // यदि आवश्यक डेटा गायब है, तो यूजर को लॉग आउट करना बेहतर है ताकि वे ऐप के गलत स्टेट में न रहें।
              await signOut(); // ✅ signOut को कॉल करें
              return; // आगे न बढ़ें
          }

          // ✅ यहाँ सुधार: सुनिश्चित करें कि idToken को user ऑब्जेक्ट में जोड़ा गया है
          const fullUser: User = {
              ...backendUser,
              firebaseUid: fbUser.uid, // सुनिश्चित करें कि Firebase UID मौजूद है
              idToken: idToken, // ✅ idToken को user ऑब्जेक्ट में जोड़ें
          };

          setUser(fullUser);
          console.log("User data (including idToken) set in context:", fullUser);

        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          // यदि सर्वर लॉगिन विफल होता है तो Firebase से भी लॉगआउट करें
          await signOut(); // ✅ signOut को कॉल करें
        }
      } else {
        console.log("Auth State Changed: No Firebase user detected. Setting user to null.");
        setUser(null); // यदि Firebase user नहीं है तो फ्रंटएंड user को भी null करें
      }

      setIsLoadingAuth(false); // auth state लोड होने के बाद लोडिंग को फॉल्स करें
      console.log("Auth loading set to false.");
    });

    return unsubscribe;
  }, [signOut]); // ✅ signOut को dependency array में जोड़ें क्योंकि यह useCallback से आ रहा है

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
