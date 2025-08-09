// client/src/pages/SellerApply.tsx

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SellerOnboardingDialog from "@/components/seller/SellerOnboardingDialog";
import { useNavigate } from "react-router-dom";

const SellerApply = () => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Wait until ALL auth data has loaded.
    if (isLoadingAuth) {
      return;
    }
    
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }
    
    // ✅ Ensure user data exists before proceeding.
    if (user) {
      if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;
        if (approvalStatus === "approved") {
          navigate("/seller-dashboard", { replace: true });
        } else if (approvalStatus === "pending") {
          navigate("/seller-status", { replace: true });
        } else {
          setIsDialogOpen(true);
        }
      } else {
        // The user role is not 'seller', so they are a 'customer'
        setIsDialogOpen(true);
      }
    }
    
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* ✅ Wait until loading is complete before rendering the dialog */}
      {!isLoadingAuth && (
        <SellerOnboardingDialog
          isOpen={isDialogOpen}
          onClose={() => navigate("/", { replace: true })}
        />
      )}
    </div>
  );
};

export default SellerApply;
