// Client/src/pages/delivery-login.tsx
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
// import { apiRequest } from "@/lib/apiRequest"; // अब इसकी सीधी जरूरत नहीं होगी अगर आप fetch का उपयोग कर रहे हैं
import { Truck } from "lucide-react";
import { signInWithGooglePopup } from "@/lib/firebase"; // Common function import

export default function DeliveryLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleFirebasePopupLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGooglePopup();
      const user = result.user;

      if (!user) {
        throw new Error("Firebase user not found after sign-in.");
      }

      // Send token to backend using POST method to a new dedicated login endpoint
      const token = await user.getIdToken();

      const response = await fetch("/api/delivery/login", { // ✅ नया POST URL
        method: "POST", // ✅ मेथड POST होना चाहिए
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // टोकन भेजना ज़रूरी है
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email || "",
          name: user.displayName || user.email || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to authenticate with backend.");
      }

      const backendResponse = await response.json();
      const deliveryBoy = backendResponse.user; // सर्वर से आया हुआ डिलीवरी बॉय डेटा

      if (!deliveryBoy) {
        throw new Error("Delivery boy data not received from backend.");
      }

      // Save in localStorage (आप अपने टोकन और ईमेल को localStorage में सेव कर सकते हैं)
      localStorage.setItem("deliveryBoyToken", token);
      localStorage.setItem("deliveryBoyEmail", deliveryBoy.email || ""); // या backendResponse से ईमेल

      // Call backend to check approval (यह अब ऊपर वाले fetch कॉल में शामिल हो जाएगा)
      if (deliveryBoy.approvalStatus === "approved") { // ✅ सर्वर रिस्पांस से approvalStatus चेक करें
        toast({ title: "Login Successful", description: `Welcome ${deliveryBoy.name || deliveryBoy.email}` });
        navigate("/delivery-dashboard");
      } else {
        toast({
          title: "Approval Pending",
          description: "You are not approved yet. Please wait for admin approval.",
          variant: "destructive",
        });
      }
    } catch (err: any) { // err को any टाइप दें ताकि message प्रॉपर्टी एक्सेस कर सकें
      console.error("Delivery login failed:", err);
      toast({
        title: "Login Failed",
        description: err.message || "Something went wrong during login.",
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
