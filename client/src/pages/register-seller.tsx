// client/src/pages/RegisterSellerPage.tsx
import React from 'react';
import { useAuth } from "@/hooks/useAuth";
import SellerRegistrationForm from "@/components/seller/SellerRegistrationForm"; // ✅ सही कॉम्पोनेंट इम्पोर्ट किया गया
import Loader from "../../../shared/Loader"; // सुनिश्चित करें कि Loader का पाथ सही है
import { useLocation } from 'wouter'; // रीडायरेक्शन के लिए wouter का उपयोग करें

export default function RegisterSeller() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation(); // wouter से setLocation प्राप्त करें

  // 1. अगर ऑथ डेटा लोड हो रहा है तो लोडर दिखाएं
  if (loading) {
    return <Loader />;
  }

  // 2. अगर यूजर लॉग इन नहीं है, तो उसे लॉगिन पेज पर भेजें
  //    (यह AuthRedirectGuard द्वारा भी संभाला जा सकता है, लेकिन एक फॉलबैक अच्छा है)
  if (!user) {
    // यह तभी चलना चाहिए जब AuthRedirectGuard किसी कारण से इसे हैंडल न करे
    // या यदि यूजर सीधे इस URL पर आता है और लॉग इन नहीं है।
    setLocation("/login"); // या आपका मुख्य लॉगिन पेज
    return null; // रीडायरेक्ट के बाद कुछ भी रेंडर न करें
  }

  // 3. यदि यूजर पहले से ही एक "approved-seller" है, तो उसे डैशबोर्ड पर रीडायरेक्ट करें
  //    यह भी AuthRedirectGuard द्वारा संभाला जा सकता है, लेकिन एक फॉलबैक अच्छा है।
  if (user.role === "approved-seller") {
    setLocation("/seller-dashboard");
    return null; // रीडायरेक्ट के बाद कुछ भी रेंडर न करें
  }

  // 4. अगर यूजर लॉग इन है और "not-approved-seller" है (या अभी तक कोई रोल नहीं है और वह सेलर फ्लो में है),
  //    तो SellerRegistrationForm रेंडर करें।
  //    user.role === "not-approved-seller" स्पष्ट रूप से दिखाता है कि यह सही यूजर है।
  //    यदि user.role null है लेकिन वे seller flow से आए हैं, तो फॉर्म दिखाएँ।
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12">
      <SellerRegistrationForm />
    </div>
  );
}
