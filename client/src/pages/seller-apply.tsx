import React, { useEffect, useState } from "react"; import { useAuth } from "@/hooks/useAuth"; import SellerOnboardingDialog from "@/components/headers/seller/SellerOnboardingDialog"; import { useNavigate } from "react-router-dom";

const SellerApply = () => { const { user, isAuthenticated, isLoadingAuth } = useAuth(); const [isDialogOpen, setIsDialogOpen] = useState(false); const navigate = useNavigate();

useEffect(() => { if (!isLoadingAuth) { if (!isAuthenticated) { navigate("/auth"); } else if (user?.role === "seller") { if (user?.seller?.approvalStatus === "approved") { navigate("/seller-dashboard"); } else if (user?.seller?.approvalStatus === "pending") { navigate("/seller-status"); } else { setIsDialogOpen(true); // Show dialog if seller and not approved } } else { setIsDialogOpen(true); // Customer trying to become seller } } }, [isAuthenticated, isLoadingAuth, user, navigate]);

return ( <div className="min-h-screen bg-white flex items-center justify-center"> {!isLoadingAuth && ( <SellerOnboardingDialog isOpen={isDialogOpen} onClose={() => navigate("/")} /> )} </div> ); };

export default SellerApply;

                                       
