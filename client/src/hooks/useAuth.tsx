// client/src/hooks/useAuth.tsx
import { useEffect, useState, useContext, createContext } from 'react';
import {
  onAuthStateChanged,
  getRedirectResult,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { AppUser } from '@/shared/backend/schema';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const isAuthenticated = !!firebaseUser;

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔄 Checking redirect result...');
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('✅ Redirect result found. Firebase user:', result.user.email);
          setFirebaseUser(result.user);
        } else {
          console.log('ℹ️ No redirect result user.');
        }
      } catch (error) {
        console.error('❌ Error handling redirect result:', error);
      }

      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        console.log('🔄 onAuthStateChanged triggered. User:', fbUser?.uid || 'null');
        setFirebaseUser(fbUser);

        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            console.log('🔐 Firebase ID token fetched, calling backend login...');

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
            console.log('✅ User fetched/created from backend:', response.user.email);
          } catch (error: any) {
            console.error('❌ Error creating/fetching user:', error.message);
            await firebaseSignOut(auth);
            setUser(null);
            setFirebaseUser(null);
          }
        } else {
          console.log('ℹ️ Firebase user not found. Signing out locally.');
          setUser(null);
          // 🔴 यह unnecessary है क्योंकि आप Firebase यूज़ कर रहे हैं:
          // await apiRequest('POST', '/auth/logout');
        }

        setIsLoadingAuth(false);
        console.log('🔁 Auth loading state completed.');
      });

      return () => unsubscribe();
    };

    initAuth();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log('✅ User signed out.');
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  const contextValue = {
    user,
    firebaseUser,
    isLoadingAuth,
    isAuthenticated,
    signOut,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
