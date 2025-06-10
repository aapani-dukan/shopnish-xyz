// pages/seller.tsx
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Loader from "../../../shared/Loader";

export default function SellerRedirectPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role === "seller") {
      if (user.seller?.approvalStatus === "approved") {
        navigate("/seller-dashboard");
      } else {
        navigate("/register-seller");
      }
    } else {
      navigate("/");
    }
  }, [user, loading]);

  return <Loader />;
}
