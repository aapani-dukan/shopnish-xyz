// Client/src/components/auth-redirect-guard.tsx
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth'; // ✅ useAuth को यहाँ इम्पोर्ट किया गया है

export default function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) {
      return;
    }

    const loginRole = sessionStorage.getItem("loginRole");

    if (user) {
      if (loginRole === "seller") {
        sessionStorage.removeItem("loginRole"); 

        if (user.role === "approved-seller") {
          setLocation("/seller-dashboard");
          return;
        } else if (user.role === "not-approved-seller") {
          setLocation("/seller-registration-form");
          return;
        }
      } 
    } else {
      // If user is logged out, you might want to redirect them to a login page
      // if (location.pathname !== '/login') setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return <>{children}</>;
}
