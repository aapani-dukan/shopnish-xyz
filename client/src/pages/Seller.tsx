// pages/seller.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SellerDashboard from "./seller-dashboard";
import SellerRegistrationModal from "@/components/modals/seller-registration-modal";
import Loader from "@/components/shared/loader";

export default function SellerGate() {
  const { user, loading: authLoading } = useAuth();
  const [seller, setSeller] = useState(null);
  const [checkingSeller, setCheckingSeller] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!user) {
        setCheckingSeller(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/sellers/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 200) {
          const data = await res.json();
          setSeller(data);
        } else if (res.status === 404) {
          setSeller(null); // not registered yet
        } else {
          console.error("Unexpected seller status", res.status);
        }
      } catch (err) {
        console.error("Error fetching seller info", err);
      } finally {
        setCheckingSeller(false);
      }
    };

    fetchSeller();
  }, [user]);

  if (authLoading || checkingSeller) {
    return <Loader />;
  }

  if (!user) {
    return <div>Please sign in to continue</div>;
  }

  if (!seller) {
    return <SellerRegistrationModal />;
  }

  return <seller-dashboard seller={seller} />;
}
