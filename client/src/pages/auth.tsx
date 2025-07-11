// client/src/pages/auth.tsx

import { useEffect, useState } from "react";
import { initiateGoogleSignInSmart } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [, navigate] = useLocation();
  const storedIntent = localStorage.getItem("redirectIntent");

  useEffect(() => {
    if (isLoadingAuth) return;

    if (isAuthenticated) {
      if (storedIntent === "become-seller") {
        localStorage.removeItem("redirectIntent");

        let target = "/seller-apply";
        const approval = user?.seller?.approvalStatus;

        if (approval === "approved") target = "/seller-dashboard";
        else if (approval === "pending") target = "/seller-status";

        navigate(target);
        return;
      }

      navigate("/");
    }
  }, [isAuthenticated, isLoadingAuth, storedIntent, user]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await initiateGoogleSignInSmart();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setIsSigningIn(false);
    }
  };

  if (isLoadingAuth) return <div className="text-center p-6">Loading...</div>;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Welcome Back</h1>
              <p className="text-gray-600">
                {storedIntent === "become-seller"
                  ? "Please sign in to continue your seller application."
                  : "Sign in to access your dashboard"}
              </p>
            </div>
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="mr-3">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
