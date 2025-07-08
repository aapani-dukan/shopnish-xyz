// src/hooks/useAuth.tsx (उदाहरण)

import { useEffect, useState, useContext, createContext } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from "@/lib/firebase"; // ✅ Correct path
import { queryClient } from '@/lib/queryClient'; // आपके QueryClient का इम्पोर्ट
import { apiRequest } from '@/lib/queryClient'; // आपके apiRequest फ़ंक्शन का इम्पोर्ट
import { AppUser } from '@/shared/backend/schema'; // आपकी यूजर स्कीमा

// AuthContext को परिभाषित करें
interface AuthContextType {
  user: AppUser | null; // आपके डेटाबेस से यूजर डेटा
  firebaseUser: FirebaseUser | null; // Firebase का raw यूजर ऑब्जेक्ट
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // अन्य ऑथेंटिकेशन संबंधित फ़ंक्शंस
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null); // आपके DB से यूजर डेटा
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // Firebase से सीधा यूजर ऑब्जेक्ट
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // क्या ऑथेंटिकेशन स्टेट लोड हो रही है

  // isAuthenticated स्टेट firebaseUser की मौजूदगी से निर्धारित होता है
  const isAuthenticated = !!firebaseUser; // अगर firebaseUser मौजूद है तो true, वरना false

  useEffect(() => {
    // Firebase ऑथेंटिकेशन स्टेट में बदलाव को सुनें
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("useAuth.tsx: onAuthStateChanged triggered. FirebaseUser:", fbUser?.uid || "null");
      setFirebaseUser(fbUser); // Firebase यूजर को स्टेट में सेट करें

      if (fbUser) {
        // यदि Firebase यूजर लॉग इन है, तो हमारे बैकएंड से यूजर डेटा लाएं/बनाएं
        try {
          const idToken = await fbUser.getIdToken(); // Firebase ID Token प्राप्त करें
          console.log("useAuth.tsx: Firebase ID Token obtained. Length:", idToken.length);

          // हमारे बैकएंड के /api/auth/login एंडपॉइंट को कॉल करें
          // यह एंडपॉइंट सेशन कुकी सेट करेगा और हमारे DB में यूजर को चेक/क्रिएट करेगा।
          const response = await apiRequest<{ user: AppUser }>({
            method: 'POST',
            path: '/auth/login',
            headers: {
              Authorization: `Bearer ${idToken}`, // Authorization हेडर में टोकन भेजें
            },
            // यदि आप firstName/lastName जैसी अतिरिक्त जानकारी भेजना चाहते हैं तो body में भेज सकते हैं
            body: {
              email: fbUser.email,
              name: fbUser.displayName,
              // ... अन्य Firebase user properties
            },
          });

          setUser(response.user); // बैकएंड से प्राप्त यूजर डेटा सेट करें
          console.log("useAuth.tsx: User data fetched/created from backend:", response.user);

        } catch (error: any) {
          console.error("useAuth.tsx: Error creating/fetching user in our database:", error.message);
          // यदि बैकएंड कॉल फेल होता है, तो यूजर को लॉग आउट करें ताकि वह फिर से कोशिश कर सके
          await auth.signOut();
          setUser(null);
          setFirebaseUser(null);
        }
      } else {
        // यदि Firebase यूजर लॉग आउट है
        console.log("useAuth.tsx: No Firebase user detected. Setting user to null.");
        setUser(null); // लोकल यूजर डेटा को क्लियर करें
        // कुकी को भी क्लियर करें (सेशन कुकी सर्वर-साइड से क्लियर होती है, या ब्राउज़र द्वारा एक्सपायर होती है)
        // यदि आवश्यक हो तो आप एक /api/auth/logout एंडपॉइंट बना सकते हैं जो सर्वर-साइड कुकी को हटा दे।
        try {
            await apiRequest({ method: 'POST', path: '/auth/logout' });
            console.log("useAuth.tsx: Backend logout call successful.");
        } catch (error) {
            console.error("useAuth.tsx: Error calling backend logout:", error);
        }
      }
      setIsLoadingAuth(false); // ऑथेंटिकेशन स्टेट लोड हो चुकी है
      console.log("useAuth.tsx: Auth loading set to false.");
    });

    // कंपोनेंट अनमाउंट होने पर लिसनर को क्लीनअप करें
    return () => unsubscribe();
  }, []); // खाली डिपेंडेंसी एरे, यह केवल एक बार चलेगा

  // Google के साथ साइन-इन फ़ंक्शन
  const signInWithGoogle = async () => {
    // Google साइन-इन लॉजिक यहां (पॉपअप या रीडायरेक्ट)
    // जैसे: await signInWithPopup(auth, googleProvider);
  };

  // साइन-आउट फ़ंक्शन
  const signOut = async () => {
    try {
      await auth.signOut();
      console.log("useAuth.tsx: User signed out successfully.");
      // onAuthStateChanged लिसनर बाकी स्टेट्स को अपडेट कर देगा
    } catch (error) {
      console.error("useAuth.tsx: Error signing out:", error);
    }
  };

  const contextValue = {
    user,
    firebaseUser,
    isLoadingAuth,
    isAuthenticated, // यह यहाँ उपलब्ध है
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// हुक जो AuthContext का उपयोग करता है
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

