// components/seller/SellerLogin.tsx

import { Button } from "@/components/ui/button";

export default function SellerLogin() {
  const handleLogin = () => {
    // Google login का logic यहाँ जोड़ सकते हो
    alert("Google login not implemented yet");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Please login with your Google account to continue.
      </p>
      <Button onClick={handleLogin} className="w-full">
        Login with Google
      </Button>
    </div>
  );
}
