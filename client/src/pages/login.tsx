// client/src/pages/login.tsx

import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { app } from "@/lib/firebase"; 
import { Button } from "@/components/ui/button";
import { startGoogleLogin } from "@/lib/firebase"; // ✅ इसे इम्पोर्ट करें

export default function Login() {
  // const auth = getAuth(app); // अब सीधे startGoogleLogin से Google Auth को एक्सेस करें

  const handleLogin = () => {
    // ✅ अब startGoogleLogin यूटिलिटी फ़ंक्शन का उपयोग करें
    // कोई role पैरामीटर पास नहीं कर रहे हैं, इसलिए यह loginRole को हटा देगा
    console.log("🔵 login.tsx: Calling startGoogleLogin for general user.");
    startGoogleLogin(); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Shopnish</h1>
        <p className="text-gray-600">Please login with Google to continue</p>

        <Button onClick={handleLogin}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
