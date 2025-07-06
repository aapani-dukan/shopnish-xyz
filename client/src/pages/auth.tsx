// src/pages/Auth.tsx

import { useEffect, useState } from "react";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // ✅ initiateGoogleSignInRedirect का उपयोग करें
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; // ✅ useAuth इम्पोर्ट करें
import { useLocation } from "wouter"; // ✅ useLocation इम्पोर्ट करें

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth(); // ✅ isAuthenticated और isLoadingAuth प्राप्त करें
  const [location, navigate] = useLocation(); // ✅ current location और navigate फ़ंक्शन प्राप्त करें

  // URL से 'intent' पैरामीटर निकालने का फ़ंक्शन
  const getIntentFromLocation = (loc: string): string | null => {
    try {
      const url = new URL(loc, "http://localhost"); // डमी बेस URL ताकि parsing हो सके
      return url.searchParams.get("intent");
    } catch {
      return null;
    }
  };

  const intent = getIntentFromLocation(location); // वर्तमान URL से इंटेंट प्राप्त करें

  // ✅ useEffect: यह जांचने के लिए कि क्या यूजर पहले से लॉग-इन है और उसे रीडायरेक्ट करना है
  useEffect(() => {
    console.log("AuthPage useEffect: isLoadingAuth", isLoadingAuth, "isAuthenticated", isAuthenticated);

    // यदि ऑथेंटिकेशन अभी लोड हो रहा है, तो कुछ न करें
    if (isLoadingAuth) {
      return;
    }

    // यदि यूजर पहले से लॉग-इन है और वह /auth पेज पर है, तो उसे होम पेज पर भेजें।
    // AuthRedirectGuard को भी यह करना चाहिए, लेकिन यह एक अतिरिक्त सुरक्षा परत है।
    // हालाँकि, 'AuthRedirectGuard' के नए लॉजिक में 'isAuthenticated' होने पर
    // और 'isOnAuthSpecificPath' होने पर सीधे '/' पर भेज दिया जाता है।
    // इसलिए, यह कंडीशन यहां उतनी आवश्यक नहीं है, लेकिन गलत व्यवहार को रोकने के लिए इसे रख सकते हैं।
    if (isAuthenticated) {
      console.log("AuthPage: User is already logged in. Redirecting to home or based on role.");
      // यहां हम 'intent' को प्राथमिकता नहीं दे रहे हैं क्योंकि 'AuthRedirectGuard'
      // Google लॉगिन के बाद पहले ही 'intent' को संभाल चुका होगा।
      // यदि आप सीधे '/' पर रीडायरेक्ट करना चाहते हैं, तो यह ठीक है।
      navigate("/"); 
    }
  }, [isAuthenticated, isLoadingAuth, navigate]); // निर्भरताएं: isAuthenticated, isLoadingAuth, navigate

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("AuthPage: Attempting Google Sign-In Redirect.");
      // 👇 यहाँ आपका Google साइन-इन फंक्शन कॉल होता है
      await initiateGoogleSignInRedirect(); // ✅ initiateGoogleSignInRedirect() का उपयोग करें
      
      // ✅ isLoading को false करने की आवश्यकता नहीं है क्योंकि यह एक रीडायरेक्ट है।
      // ब्राउज़र नए पेज पर चला जाएगा।
    } catch (error) {
      console.error("Error signing in:", error);
      setIsLoading(false); // त्रुटि होने पर ही isLoading को false करें
    }
  };

  // ✅ यदि ऑथेंटिकेशन अभी लोड हो रहा है और यूजर लॉग इन है, तो कुछ भी रेंडर न करें
  // (क्योंकि AuthRedirectGuard उसे रीडायरेक्ट कर देगा)
  if (isLoadingAuth || isAuthenticated) {
    return null; // या एक लोडिंग स्पिनर दिखाएं
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="text-white text-2xl w-8 h-8" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
              {/* ✅ इंटेंट के आधार पर मैसेज दिखाएं */}
              {intent === "become-seller" ? (
                <p className="text-gray-600">Please sign in to continue your seller application.</p>
              ) : (
                <p className="text-gray-600">Sign in to access your dashboard</p>
              )}
            </div>
            
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              variant="outline"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="mr-3">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
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
