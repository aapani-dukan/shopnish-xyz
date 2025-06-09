// client/src/pages/login.tsx

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Login</h1>
        <p className="text-gray-600">Please select your login type</p>

        <div className="flex flex-col gap-4">
          <Button onClick={() => navigate("/seller-login")}>Seller Login</Button>
          <Button variant="secondary" onClick={() => navigate("/admin-login")}>
            Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
}
