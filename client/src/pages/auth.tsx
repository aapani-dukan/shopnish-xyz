// src/pages/Auth.tsx

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import GoogleIcon from "@/components/ui/GoogleIcon"; // GoogleIcon इम्पोर्ट करें

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("❌ Google sign-in failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="text-white text-2xl w-8 h-8" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to access your seller dashboard
              </p>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              variant="outline"
            >
              <GoogleIcon /> {/* यहां GoogleIcon कॉम्पोनेंट का उपयोग करें */}
              Continue with Google
            </Button>

            {isLoading && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Signing you in...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
