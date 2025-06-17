// Client/src/pages/login.tsx



import { signInWithGoogle } from "@/lib/firebase";
import "@/index.css";
import { useState } from "react";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const result = await signInWithGoogle();
      const user = result.user;

      if (user) {
        const idToken = await user.getIdToken();

        const response = await apiRequest("GET", "/api/auth/me", undefined, idToken);
        const userData = await response.json();

        if (userData.role === "seller") {
          if (userData.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          } else {
            navigate("/register-seller");
          }
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome – Please Log In
        </h2>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700"
        >
          <GoogleIcon />
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
