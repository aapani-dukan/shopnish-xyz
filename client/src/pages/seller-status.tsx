// client/src/pages/seller-status.tsx (उदाहरण)
import { useSeller } from "@/hooks/useSeller";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export default function SellerStatusPage() {
  const { seller, isLoading, isAuthenticated } = useSeller();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  let title = "Seller Application Status";
  let description = "We are processing your application.";
  let icon = <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />;

  if (seller?.approvalStatus === "approved") {
    title = "Welcome, Approved Seller!";
    description = "Your seller account has been approved. You can now access your dashboard.";
    icon = <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />;
  } else if (seller?.approvalStatus === "rejected") {
    title = "Application Rejected";
    description = "Unfortunately, your seller application was rejected. Please contact support for more details.";
    icon = <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {icon}
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {/* आप यहां अतिरिक्त सामग्री या डैशबोर्ड पर जाने के लिए एक बटन जोड़ सकते हैं */}
        {/* उदाहरण: */}
        {/* {seller?.approvalStatus === "approved" && (
          <CardContent>
            <Button onClick={() => window.location.href = "/seller-dashboard"}>Go to Dashboard</Button>
          </CardContent>
        )} */}
      </Card>
    </div>
  );
}
