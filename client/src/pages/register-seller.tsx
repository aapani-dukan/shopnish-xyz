import { useAuth } from "@/hooks/useAuth";
import SellerRegistrationModal from "@/components/seller-registration-modal";
import Loader from "../../../shared/Loader";

export default function RegisterSellerPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <Loader />;
  }

  return <SellerRegistrationModal />;
}
