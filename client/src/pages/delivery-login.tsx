import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result && result.user) {
        const user = result.user;
        const token = await user.getIdToken();

        // बैकएंड को प्रमाणीकरण के लिए API call करें
        const backendResponse = await apiRequest("POST", "/api/delivery/login", {
          firebaseUid: user.uid,
          email: user.email || "",
          name: user.displayName || user.email || "",
        });

        const deliveryBoy = backendResponse.user;

        if (!deliveryBoy) {
          throw new Error("Delivery boy data not received from backend.");
        }

        // localStorage में टोकन और ईमेल सेव करें (वैकल्पिक)
        localStorage.setItem("deliveryBoyToken", token);
        localStorage.setItem("deliveryBoyEmail", deliveryBoy.email || "");

        if (deliveryBoy.approvalStatus === "approved") {
          toast({ title: "Login Successful", description: `Welcome ${deliveryBoy.name || deliveryBoy.email}` });
          navigate("/delivery-dashboard");
        } else {
          toast({
            title: "Approval Pending",
            description: "You are not approved yet. Please wait for admin approval.",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error("Delivery login (popup) failed:", err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        toast({
          title: "Login Failed",
          description: err.message || "Something went wrong during login.",
          variant: "destructive",
        });
      }
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
              onClick={handleGoogleLogin}
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
