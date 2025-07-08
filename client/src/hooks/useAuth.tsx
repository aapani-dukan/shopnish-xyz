// src/hooks/useAuth.tsx

import { useEffect, useState, useContext, createContext } from 'react';
import { onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { auth } from "@/lib/firebase";
import { apiRequest } from '@/lib/queryClient';
import { AppUser } from '@/shared/backend/schema';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const isAuthenticated = !!firebaseUser;

  useEffect(() => {
    const checkRedirectResultThenListen = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ Redirect result found:", result.user.email);
          setFirebaseUser(result.user);
          return;
        }
      } catch (err) {
        console.error("❌ Error in getRedirectResult:", err);
      }

      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        console.log("🔄 onAuthStateChanged triggered. User:", fbUser?.email || "null");
        setFirebaseUser(fbUser);

        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            const response = await apiRequest<{ user: AppUser }>({
              method: 'POST',
              path: '/auth/login',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
              body: {
                email: fbUser.email,
                name: fbUser.displayName,
              },
            });
            setUser(response.user);
            console.log("✅ User data from backend:", response.user);
          } catch (error: any) {
            console.error("❌ Error creating/fetching user:", error.message);
            await auth.signOut();
            setUser(null);
            setFirebaseUser(null);
          }
        } else {
          console.log("ℹ️ Firebase user not found. Signing out locally.");
          setUser(null);
          setFirebaseUser(null);
          try {
            await apiRequest("POST", "/auth/logout");
          } catch (err) {
            console.warn("⚠️ Backend logout failed silently.");
          }
        }

        setIsLoadingAuth(false);
      });

      return () => unsubscribe();
    };

    checkRedirectResultThenListen();
  }, []);

  const signInWithGoogle = async () => {};
  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("❌ Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoadingAuth, isAuthenticated, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
