// pages/seller.tsx
import { useAuth } from "@/hooks/useAuth";
import SellerDashboard from "@/components/seller/SellerDashboard";
import SellerRegistrationModal from "@/components/modals/seller-registration-modal";
import Loader from "@/components/shared/loader";

export default function SellerGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <div>Please sign in to continue</div>;
  }

  if (!user.seller) {
    return <SellerRegistrationModal />;
  }

  return <SellerDashboard seller={user.seller} />;
}
