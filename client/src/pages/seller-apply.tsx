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
        // ✅ यहाँ `user.sellerProfile` का उपयोग करें
        if (user.sellerProfile?.approvalStatus === "approved") {
          navigate("/seller-dashboard");
        } else if (user.sellerProfile?.approvalStatus === "pending") {
          navigate("/seller-status");
        } else {
          setIsDialogOpen(true);
        }
      } else {
        // ✅ यह लॉजिक customer role के लिए है
        setIsDialogOpen(true);
      }
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {!isLoadingAuth && (
        <SellerOnboardingDialog
          isOpen={isDialogOpen}
          onClose={() => navigate("/")}
        />
      )}
    </div>
  );
};

export default SellerApply;
