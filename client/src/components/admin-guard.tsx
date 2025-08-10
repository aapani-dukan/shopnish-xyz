// client/src/components/admin-guard.tsx

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/users/me", {
          // ✅ यह सबसे महत्वपूर्ण बदलाव है।
          credentials: 'include' 
        });

        if (res.ok) {
          const userData = await res.json();
          if (userData.role === 'admin') {
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        console.error("Failed to check admin session:", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAdminSession();
  }, []);

  if (isLoading) {
    // ... (आपका लोडिंग UI)
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
