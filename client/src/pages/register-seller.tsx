import { useAuth } from "@/hooks/useAuth";

import Loader from "../../../shared/Loader";

export default function RegisterSellerPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <Loader />;
  }

  
}
