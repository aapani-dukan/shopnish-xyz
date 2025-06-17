// Client/src/pages/login.tsx
import { signInWithGoogle } from "@/lib/firebase";
import "@/index.css";
import { useState } from "react";
import GoogleIcon from "@/components/ui/GoogleIcon"; // GoogleIcon इम्पोर्ट करें

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGooglePopup = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
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
          onClick={handleGooglePopup}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700"
        >
          <GoogleIcon /> {/* यहां GoogleIcon कॉम्पोनेंट का उपयोग करें */}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
