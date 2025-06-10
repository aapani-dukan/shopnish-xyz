// client/src/pages/register-seller.tsx

import React from 'react';
import { useAuth } from "@/hooks/useAuth";
// **यहां बदलाव किया गया है:** SellerRegistrationForm को named import के रूप में इम्पोर्ट करें
import { SellerRegistrationForm } from "@/components/seller/SellerRegistrationForm"; // ✅ अब यह सही है
import Loader from "../../../shared/Loader"; // सुनिश्चित करें कि Loader का पाथ सही है
import { useLocation } from 'wouter';

export default function RegisterSeller() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (user.role === "approved-seller") {
    setLocation("/seller-dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12">
      <SellerRegistrationForm />
    </div>
  );
}
