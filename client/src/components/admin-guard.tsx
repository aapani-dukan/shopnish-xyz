// client/src/components/admin-guard.tsx

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoadingAuth, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ✅ यदि उपयोगकर्ता एडमिन नहीं है, तो उसे /admin-login पर रीडायरेक्ट करें
  if (!isAdmin) {
    return <Navigate to="/admin-login" state={{ from: location.pathname }} replace />;
  }

  // ✅ यदि एडमिन है, तो डैशबोर्ड को रेंडर करें
  return <>{children}</>;
};

export default AdminGuard;
