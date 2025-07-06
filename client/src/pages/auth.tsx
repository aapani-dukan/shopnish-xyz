// src/pages/Auth.tsx

import { useEffect, useState } from "react";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; 
import { useLocation } from "wouter"; 

export default function AuthPage() {
  const [isSigningIn, setIsSigningIn] = useState(false); // isLoading को isSigningIn में बदला
  const { isAuthenticated, isLoadingAuth, user } = useAuth(); // ✅ 'user' को भी इम्पोर्ट करें
  const [, navigate] = useLocation(); 

  // localStorage से 'intent' प्राप्त करें
  const storedIntent = localStorage.getItem('redirectIntent'); 

  useEffect(() => {
    console.log("AuthPage useEffect triggered. Auth Status:", { isLoadingAuth, isAuthenticated, userId: user?.uid, currentPath: location });
    console.log("AuthPage useEffect: Stored Intent:", storedIntent);

    // ✅ स्टेप 1: ऑथेंटिकेशन स्टेट लोड होने तक प्रतीक्षा करें
    if (isLoadingAuth) {
      console.log("AuthPage useEffect: Auth state is still loading. Waiting...");
      return;
    }

    // ✅ स्टेप 2: यदि यूजर पहले से लॉग-इन है
    if (isAuthenticated) {
      console.log("AuthPage useEffect: User is already authenticated.");

      // यदि कोई विशिष्ट इंटेंट localStorage में है, तो उसे हैंडल करें
      if (storedIntent === "become-seller") {
        console.log("AuthPage: Authenticated user with 'become-seller' intent. Redirecting to seller flow.");
        localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें
        
        // सीधे सही विक्रेता पेज पर रीडायरेक्ट करें
        let sellerTargetPath: string;
        if (user?.role === "seller") { 
            const approvalStatus = user.seller?.approvalStatus;
            if (approvalStatus === "approved") {
                sellerTargetPath = "/seller-dashboard";
            } else if (approvalStatus === "pending") {
                sellerTargetPath = "/seller-status";
            } else { // rejected या कोई और स्थिति
                sellerTargetPath = "/seller-apply";
            }
        } else {
            // यदि यूजर 'customer' या कोई अन्य भूमिका है, तो उसे अप्लाई करने के लिए भेजें
            sellerTargetPath = "/seller-apply";
        }
        navigate(sellerTargetPath); // सीधे भेजें, AuthRedirectGuard को यहां हस्तक्षेप करने की जरूरत नहीं
        return; // रीडायरेक्ट के बाद फंक्शन से बाहर
      } 
      
      // यदि कोई विशिष्ट इंटेंट नहीं है, तो होम पेज पर भेजें
      console.log("AuthPage: Authenticated user with no specific intent. Redirecting to home page.");
      navigate("/"); // होम पेज पर भेजें
      return; // रीडायरेक्ट के बाद फंक्शन से बाहर
    }

    // ✅ यदि यूजर लॉग-इन नहीं है और ऑथेंटिकेशन लोड हो चुका है, तो यहां UI दिखेगा।
    console.log("AuthPage useEffect: User is NOT authenticated and auth state is loaded. Displaying login form.");

  }, [isAuthenticated, isLoadingAuth, navigate, storedIntent, user]); // निर्भरताएं: सुनिश्चित करें कि सभी उपयोग किए गए वेरिएबल्स शामिल हैं

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true); // isLoading की जगह isSigningIn का उपयोग करें
      console.log("AuthPage: Attempting Google Sign-In Redirect.");
      await initiateGoogleSignInRedirect(); 
      // यह लाइन रीडायरेक्ट के कारण कभी नहीं पहुंचेगी, इसलिए setIsSigningIn(false) की जरूरत नहीं।
    } catch (error) {
      console.error("Error signing in:", error);
      setIsSigningIn(false); // त्रुटि होने पर ही isLoading को false करें
    }
  };

  // ✅ रेंडरिंग लॉजिक को यहाँ और स्पष्ट करें:
  if (isLoadingAuth) {
    // जब तक ऑथेंटिकेशन स्टेट लोड नहीं हो जाती, एक लोडिंग इंडिकेटर दिखाएं।
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  // ✅ यदि यूजर लॉग-इन है (और isLoadingAuth false है), तो यह पेज नहीं दिखना चाहिए,
  // क्योंकि useEffect उसे रीडायरेक्ट कर देगा। अगर किसी कारणवश useEffect ने अभी तक रीडायरेक्ट नहीं किया,
  // तो भी हम लॉगिन UI नहीं दिखाना चाहते।
  if (isAuthenticated) {
      // यह स्थिति तब आ सकती है जब AuthRedirectGuard अभी प्रोसेस कर रहा हो।
      // हम यहां कोई UI रेंडर नहीं करेंगे क्योंकि यूजर को वैसे भी रीडायरेक्ट किया जाएगा।
      return null;
  }

  // ✅ यदि यूजर लॉग-इन नहीं है (isAuthenticated false है) और ऑथेंटिकेशन लोड हो चुका है (isLoadingAuth false है),
  // तो लॉगिन फॉर्म दिखाएं।
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
              {/* storedIntent के आधार पर मैसेज दिखाएं */}
              {storedIntent === "become-seller" ? (
                <p className="text-gray-600">Please sign in to continue your seller application.</p>
              ) : (
                <p className="text-gray-600">Sign in to access your dashboard</p>
              )}
            </div>
            
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn} // isLoading की जगह isSigningIn का उपयोग करें
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
            
            {isSigningIn && ( // isLoading की जगह isSigningIn का उपयोग करें
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
