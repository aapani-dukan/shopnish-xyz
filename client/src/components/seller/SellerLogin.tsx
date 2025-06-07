import { Button } from "@/components/ui/button";
import { signInWithGoogle, onAuthStateChange } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SellerLogin() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const token = await user.getIdToken();

      // 🔍 Backend से seller info check करो
      const res = await fetch("/api/sellers/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data && data.approvalStatus === "approved") {
        navigate("/seller/dashboard");
      } else {
        setShowRegister(true);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google login failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Please login with your Google account to continue.
      </p>
      <Button onClick={handleLogin} className="w-full">
        Login with Google
      </Button>

      {showRegister && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // ✅ Seller Registration Modal को open करने वाला state या function call करें
            const event = new CustomEvent("open-seller-registration");
            window.dispatchEvent(event);
          }}
        >
          Register as a Seller
        </Button>
      )}
    </div>
  );
}
