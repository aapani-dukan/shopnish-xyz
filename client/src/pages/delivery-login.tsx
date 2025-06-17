import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Truck } from "lucide-react";

export default function DeliveryLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const email = localStorage.getItem("deliveryBoyEmail");
      const token = localStorage.getItem("deliveryBoyToken");

      if (!email || !token) {
        toast({
          title: "Not Logged In",
          description: "Please register or login to continue.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const res = await apiRequest("GET", "/api/delivery/me", null, {
        Authorization: `Bearer ${token}`,
      });

      if (res.user.approvalStatus === "approved") {
        navigate("/delivery-dashboard");
      } else {
        toast({
          title: "Approval Pending",
          description: "You are not approved yet. Please wait for admin approval.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid or expired session. Please register or try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate("/delivery-apply");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Delivery Boy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Checking..." : "Login"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRegister}
            >
              Register
            </Button>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-gray-600">
          Need help? Contact support@shopnish.com
        </p>
      </div>
    </div>
  );
}
