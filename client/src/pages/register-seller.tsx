// pages/register-seller.tsx
import { useEffect } from "react";
import { useLocation } from "wouter";
imimport Loader from "../../../shared/Loader";port { useAuth } from "@/hooks/useAuth";

import SellerRegistrationModal from "@/components/modals/seller-registration-modal";

export default function RegisterSellerPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <Loader />;
  }

  return <SellerRegistrationModal />;
}
