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
          // ✅ यह बदलाव सबसे महत्वपूर्ण है।
          // `credentials: 'include'` ब्राउज़र को अनुरोध के साथ कुकीज़ भेजने का निर्देश देता है।
          credentials: 'include' 
        });

        if (res.ok) {
          const userData = await res.json();
          // सिर्फ एडमिन रोल की जाँच करें
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // यदि एडमिन नहीं है, तो लॉगिन पेज पर भेजें
  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  // यदि एडमिन है, तो डैशबोर्ड दिखाएं
  return <>{children}</>;
};

export default AdminGuard;
