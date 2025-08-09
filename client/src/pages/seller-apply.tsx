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
    // अगर auth अभी लोड हो रहा है, तो कुछ न करें
    if (isLoadingAuth) {
      return;
    }
    
    // अगर user लॉग इन नहीं है, तो लॉगिन पेज पर भेजें
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }
    
    // अगर user डेटा उपलब्ध है, तो आगे बढ़ें
    if (user) {
      if (user.role === "seller") {
        const approvalStatus = user.sellerProfile?.approvalStatus;
        if (approvalStatus === "approved") {
          navigate("/seller-dashboard", { replace: true });
        } else if (approvalStatus === "pending") {
          navigate("/seller-status", { replace: true });
        } else {
          // अगर स्टेटस 'rejected' या 'null' है, तो डायलॉग खोलें
          setIsDialogOpen(true);
        }
      } else {
        // अगर रोल 'customer' है, तो डायलॉग खोलें
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
