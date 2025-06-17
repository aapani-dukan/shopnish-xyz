// Client/src/pages/delivery-login.tsx
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Truck } from "lucide-react";
import { signInWithGooglePopup } from "@/lib/firebase"; // Common function import

export default function DeliveryLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleFirebasePopupLogin = async () => {
    setLoading(true);
    try {
      // Use the common Firebase sign-in function
      const result = await signInWithGooglePopup();
      const user = result.user;

      // Send token to backend
      const token = await user.getIdToken();

      // Save in localStorage
      localStorage.setItem("deliveryBoyToken", token);
      localStorage.setItem("deliveryBoyEmail", user.email || "");

      // Call backend to check approval
      const res = await apiRequest("GET", "/api/delivery/me", null, {
        Authorization: `Bearer ${token}`,
      });

      if (res.user && res.user.approvalStatus === "approved") {
        toast({ title: "Login Successful", description: `Welcome ${res.user.firstName}` });
        navigate("/delivery-dashboard");
      } else {
        toast({
          title: "Approval Pending",
          description: "You are not approved yet. Please wait for admin approval.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Login failed:", err);
      toast({
        title: "Login Failed",
        description: "Something went wrong during login.",
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
              onClick={handleFirebasePopupLogin}
              disabled={loading}
            >
              {loading ? "Checking..." : "Login with Google"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRegister}
              disabled={loading}
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
