// client/src/pages/seller-status.tsx

import React from "react";
import { useAuth } from "@/hooks/useAuth"; // ✅ useAuth को इम्पोर्ट करें
import { useSeller } from "@/hooks/useSeller"; // ✅ useSeller को इम्पोर्ट करें
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // ✅ Button इम्पोर्ट करें
import { Link } from "wouter"; // ✅ Link इम्पोर्ट करें
import { Clock, CheckCircle, XCircle, Store, AlertCircle } from "lucide-react"; // ✅ सभी आवश्यक आइकन इम्पोर्ट करें

export default function SellerStatusPage() {
  // ✅ useAuth से ऑथेंटिकेशन स्टेटस और यूजर रोल प्राप्त करें
  const { user, isLoadingAuth, isAuthenticated } = useAuth(); 
  // ✅ useSeller से विक्रेता का डेटा और लोडिंग स्थिति प्राप्त करें
  const { seller, isLoading: isLoadingSellerData } = useSeller(); 

  // --- 1. ऑथेंटिकेशन और डेटा लोडिंग की स्थिति ---
  if (isLoadingAuth || isLoadingSellerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // --- 2. यदि यूजर प्रमाणित नहीं है ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in to check your seller application status or to start a new application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/"> {/* होम पेज पर जाने या लॉगिन/रजिस्टर करने के लिए */}
              <Button>Go to Home & Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- 3. ऑथेंटिकेटेड यूजर के लिए विक्रेता आवेदन की स्थिति निर्धारित करें ---
  let title = "Seller Application Status";
  let description = "We are checking your application status.";
  let IconComponent: React.ElementType = Clock;
  let iconColor = "text-gray-500";
  let showActionButton = false;
  let actionButtonText = "";
  let actionButtonLink = "";
  let actionButtonVariant: "default" | "secondary" | "destructive" | "ghost" | "link" = "default";


  // user.role या seller.approvalStatus के आधार पर लॉजिक
  if (user?.role === "seller" && seller?.approvalStatus === "approved") {
    // यूजर का रोल 'seller' है या seller डेटा 'approved' दिखाता है
    title = "Welcome, Approved Seller!";
    description = "Your seller account has been approved. You can now access your dashboard and start managing your business.";
    IconComponent = CheckCircle;
    iconColor = "text-green-500";
    showActionButton = true;
    actionButtonText = "Go to Seller Dashboard";
    actionButtonLink = "/seller-dashboard";
    actionButtonVariant = "default";
  } else if (user?.role === "seller" || seller?.approvalStatus === "pending") {
    // यूजर का रोल seller' है या seller डेटा 'pending' दिखाता है
    title = "Application Under Review";
    description = "Thank you for applying to become a seller on Shopnish. Our admin team is reviewing your application. You will be notified once your account is approved.";
    IconComponent = Clock;
    iconColor = "text-yellow-500";
    // यदि आप यहां री-सबमिट या अपडेट करने की अनुमति देते हैं, तो बटन दिखा सकते हैं
    showActionButton = false; // या true, यदि आप आवेदन संपादित करने की अनुमति देते हैं
  } else if (seller?.approvalStatus === "rejected") {
    // seller डेटा 'rejected' दिखाता है
    title = "Application Rejected";
    description = `Unfortunately, your seller application was rejected. Reason: ${seller.rejectionReason || 'No specific reason provided.'} Please review the criteria or contact support for more details.`;
    IconComponent = XCircle;
    iconColor = "text-red-500";
    showActionButton = true;
    actionButtonText = "Re-apply as Seller";
    actionButtonLink = "/seller-apply"; // आवेदन पेज पर वापस जाने के लिए
    actionButtonVariant = "secondary";
  } else if (user?.role === "user" && !seller) {
    // यूजर सामान्य 'user' है और उसने अभी तक कोई विक्रेता आवेदन जमा नहीं किया है
    title = "No Seller Application Found";
    description = "It seems you haven't applied to become a seller yet. Start your application now!";
    IconComponent = Store;
    iconColor = "text-purple-500";
    showActionButton = true;
    actionButtonText = "Apply to be a Seller";
    actionButtonLink = "/seller-apply"; // आवेदन पेज पर जाने के लिए
    actionButtonVariant = "default";
  } else {
    // कोई अन्य अप्रत्याशित स्थिति
    title = "Unknown Application Status";
    description = "We couldn't determine your seller application status. Please contact support.";
    IconComponent = AlertCircle;
    iconColor = "text-red-500";
    showActionButton = true;
    actionButtonText = "Contact Support";
    actionButtonLink = "/contact"; // आपके संपर्क पेज पर
    actionButtonVariant = "destructive";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-md w-full text-center rounded-lg shadow-lg">
        <CardHeader className="pt-8">
          <IconComponent className={`h-16 w-16 ${iconColor} mx-auto mb-4`} /> {/* आइकन का आकार बढ़ाया */}
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">{title}</CardTitle>
          <CardDescription className="text-lg text-gray-600">{description}</CardDescription>
        </CardHeader>
        {showActionButton && (
          <CardContent className="pb-8">
            <Link href={actionButtonLink}>
              <Button size="lg" className="w-full max-w-xs" variant={actionButtonVariant}>
                {actionButtonText}
              </Button>
            </Link>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
