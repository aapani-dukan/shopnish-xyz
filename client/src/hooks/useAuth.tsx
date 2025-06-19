import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleRedirectResult } from "@/lib/firebase"; // 'handleRedirectResult' का उपयोग नहीं हो रहा है, लेकिन इसे रखा गया है
import { apiRequest } from "@/lib/queryClient"; // 'apiRequest' अब 'queryClient' से आ रहा है
import { User } from "@shared/backend/schema"; // Ensure this User type is correct and matches your backend

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      console.log("Auth State Changed. firebaseUser:", firebaseUser); // लॉगिंग जोड़ी गई

      if (firebaseUser) {
        console.log("Firebase user detected. Preparing data for backend API."); // लॉगिंग जोड़ी गई
        try {
          const userData = {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || firebaseUser.email!,
          };
          console.log("UserData prepared for /api/users:", userData); // लॉगिंग जोड़ी गई

          const response = await apiRequest("POST", "/api/users", userData);
          console.log("API request to /api/users successful. Response received."); // लॉगिंग जोड़ी गई
          const user = await response.json();
          setUser(user);
          console.log("User data set in context:", user); // लॉगिंग जोड़ी गई
        } catch (error) {
          console.error("Error creating/fetching user in our database:", error);
          // एरर आने पर भी लोडिंग बंद होनी चाहिए ताकि UI स्टक न हो
          setUser(null); // यदि एरर है, तो यूजर को null सेट करें
        }
      } else { // ✅ यह 'else' अब सही 'if' ब्लॉक से जुड़ा हुआ है
        console.log("No Firebase user detected. Setting user to null."); // लॉगिंग जोड़ी गई
        setUser(null);
      }

      setLoading(false);
      console.log("Auth loading set to false."); // लॉगिंग जोड़ी गई
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null); // Sign out के बाद लोकल यूजर स्टेट भी रीसेट करें
      setFirebaseUser(null); // Firebase यूजर स्टेट भी रीसेट करें
      console.log("User signed out successfully.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
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
