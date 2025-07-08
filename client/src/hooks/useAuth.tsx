// src/hooks/useAuth.tsx

import { useEffect, useState, useContext, createContext } from 'react';
import {
  onAuthStateChanged,
  getRedirectResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';
import { AppUser } from '@/shared/backend/schema';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const isAuthenticated = !!firebaseUser;

  // ✅ STEP 1: Handle Redirect Result on initial load
  useEffect(() => {
    const handleRedirectLogin = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('✅ Firebase redirect result user:', result.user.email);
          setFirebaseUser(result.user);
        } else {
          console.log('ℹ️ No redirect result user.');
        }
      } catch (err) {
        console.error('❌ getRedirectResult error:', err);
      }
    };

    handleRedirectLogin();
  }, []);

  // ✅ STEP 2: Listen to Firebase Auth state and do backend login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('🔄 onAuthStateChanged triggered. User:', fbUser?.email || 'null');

      if (fbUser) {
        try {
          setFirebaseUser(fbUser);
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
          console.log('✅ Backend login success. User:', response.user.email);
        } catch (error: any) {
          console.error('❌ Backend login failed:', error.message);
          setUser(null);
          setFirebaseUser(null);
          await auth.signOut();
        }
      } else {
        console.log('ℹ️ Firebase user not found. Signing out locally.');
        setUser(null);
        setFirebaseUser(null);
        try {
          await apiRequest('POST', '/auth/logout');
          console.log('✅ Backend logout done.');
        } catch (err) {
          console.warn('⚠️ Backend logout failed silently.');
        }
      }

      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      console.log('🔓 User signed out.');
    } catch (error) {
      console.error('❌ Error signing out:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated,
    isLoadingAuth,
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
