// Client/src/pages/delivery-login.tsx
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Truck } from "lucide-react";
// import { signInWithGooglePopup } from "@/lib/firebase"; // ❌ अब इसकी जरूरत नहीं है
import { initiateGoogleSignInRedirect, handleRedirectResult } from "@/lib/firebase"; // ✅ इन नए फ़ंक्शंस को इम्पोर्ट करें

export default function DeliveryLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ✅ useEffect: यह रीडायरेक्ट के परिणाम को हैंडल करेगा जब यूजर वापस आएगा
  useEffect(() => {
    const handleRedirectLogin = async () => {
      setLoading(true); // लोडिंग शुरू करें
      try {
        const result = await handleRedirectResult(); // रीडायरेक्ट के परिणाम को प्राप्त करें

        if (result && result.user) { // यदि परिणाम और यूजर मौजूद हैं
          const user = result.user;

          // बाकी लॉजिक वैसा ही रहेगा जैसा पहले था
          const token = await user.getIdToken();

          const response = await fetch("/api/delivery/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
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
          const deliveryBoy = backendResponse.user;

          if (!deliveryBoy) {
            throw new Error("Delivery boy data not received from backend.");
          }

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
        console.error("Delivery login (redirect result) failed:", err);
        // यदि कोई त्रुटि है लेकिन यह यूजर के कारण नहीं है, तो शायद पॉप-अप ब्लॉक हुआ था
        // इस मामले में, हम कोई टोस्ट नहीं दिखाते हैं, या एक अलग संदेश दिखाते हैं
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          toast({
            title: "Login Failed",
            description: err.message || "Something went wrong during login.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false); // लोडिंग बंद करें, चाहे सफलता हो या विफलता
      }
    };

    handleRedirectLogin(); // कंपोनेंट माउंट होने पर इसे चलाएँ
  }, [navigate, toast]); // निर्भरताएँ जोड़ें

  const handleGoogleLogin = async () => { // ✅ फ़ंक्शन का नाम बदलें ताकि यह स्पष्ट हो
    setLoading(true); // लोडिंग शुरू करें
    try {
      await initiateGoogleSignInRedirect(); // ✅ रीडायरेक्ट-आधारित साइन-इन शुरू करें
      // इसके बाद, यूजर को Google के प्रमाणीकरण पृष्ठ पर रीडायरेक्ट किया जाएगा।
      // जब वे वापस आएंगे, तो useEffect में handleRedirectLogin इसे संभालेगा।
    } catch (err: any) {
      console.error("Failed to initiate Google Sign-In Redirect:", err);
      toast({
        title: "Login Failed",
        description: err.message || "Could not start Google login process.",
        variant: "destructive",
      });
      setLoading(false); // त्रुटि होने पर लोडिंग बंद करें
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
              onClick={handleGoogleLogin} // ✅ नए हैंडलर का उपयोग करें
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
