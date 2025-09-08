import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient"; // ✅ apiRequest आयात करें

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // ✅ useAuth से backendLogin प्राप्त करें
  const { backendLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ✅ अब सीधे useAuth के backendLogin फंक्शन को कॉल करें
      const user = await backendLogin(email, password);
      
      localStorage.setItem("deliveryBoyToken", user.idToken || ""); // ✅ यदि आवश्यक हो तो idToken को सेव करें
      localStorage.setItem("deliveryBoyEmail", user.email || "");

      if (user.role === "delivery" && user.sellerProfile?.approvalStatus === "approved") {
        toast({ title: "Login Successful", description: `Welcome ${user.name || user.email}` });
        navigate("/delivery-dashboard");
      } else {
        toast({
          title: "Approval Pending",
          description: "You are not approved yet. Please wait for admin approval.",
          variant: "destructive",
        });
      }

    } catch (err: any) {
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
            <form onSubmit={handleLogin} className="space-y-4">
                <Input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                </Button>
            </form>
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

