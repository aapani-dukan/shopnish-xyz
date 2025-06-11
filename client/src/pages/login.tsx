// client/src/pages/login.tsx

import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { app } from "@/lib/firebase"; 
import { Button } from "@/components/ui/button";
import { startGoogleLogin } from "@/lib/firebase";
import AuthRedirectGuard from "@/components/auth-redirect-guard"; // ✅ ADD THIS

export default function Login() {
  const handleLogin = () => {
    console.log("🔵 login.tsx: Calling startGoogleLogin for general user.");
    startGoogleLogin(); 
  };

  return (
    <AuthRedirectGuard> {/* ✅ WRAP everything inside this */}
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Welcome to Shopnish</h1>
          <p className="text-gray-600">Please login with Google to continue</p>

          <Button onClick={handleLogin}>
            Continue with Google
          </Button>
        </div>
      </div>
    </AuthRedirectGuard>
  );
}
