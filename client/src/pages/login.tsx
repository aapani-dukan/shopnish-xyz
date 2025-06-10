// client/src/pages/login.tsx
import { useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function Login() {
  const auth = getAuth(app);

  useEffect(() => {
    // पहले से लॉग इन हो तो Home पर भेज दो
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        window.location.replace("/");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    // ❌ कोई sessionStorage set नहीं हो रहा – ये सिर्फ सामान्य ग्राहक login है
    signInWithRedirect(auth, provider);
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
