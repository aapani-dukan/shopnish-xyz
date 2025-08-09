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
    if (!isLoadingAuth) {
      if (!isAuthenticated) {
        navigate("/auth");
      } else if (user?.role === "seller") {
        if (user.sellerProfile?.approvalStatus === "approved") {
          navigate("/seller-dashboard", { replace: true });
        } else if (user.sellerProfile?.approvalStatus === "pending") {
          navigate("/seller-status", { replace: true });
        } else {
          setIsDialogOpen(true);
        }
      } else {
        setIsDialogOpen(true);
      }
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
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
