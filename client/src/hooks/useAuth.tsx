// src/hooks/useAuth.tsx
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User, getIdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authenticatedApiRequest } from '@/lib/api';

// डेटा स्ट्रक्चर को परिभाषित करें
interface SellerProfile {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface UserData extends User {
  idToken: string;
  role: 'customer' | 'seller' | 'admin' | 'delivery';
  sellerProfile?: SellerProfile | null;
  name?: string;
}

// AuthContext को परिभाषित करें
interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// यह फंक्शन उपयोगकर्ता डेटा को फ़ेच करेगा
async function fetchUserData(user: User, idToken: string) {
  try {
    const response = await authenticatedApiRequest('GET', '/api/users/me', null, idToken);
    
    if (response.status === 404) {
      console.warn("User profile not found, treating as a new customer.");
      return {
        ...user,
        idToken,
        role: "customer",
        sellerProfile: null
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const userData = await response.json();
    return {
      ...user,
      ...userData.user,
      idToken,
      sellerProfile: userData.user.sellerProfile || null
    };

  } catch (error) {
    console.error("Failed to fetch user data from backend:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const tokenResult = await getIdTokenResult(firebaseUser);
          const idToken = tokenResult.token;
          const userWithProfile = await fetchUserData(firebaseUser, idToken);
          if (userWithProfile) {
            setUser(userWithProfile as UserData);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
