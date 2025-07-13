// client/src/pages/auth.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // useNavigate और useLocation का उपयोग करें
import { useAuth } from "@/hooks/useAuth"; // अपना useAuth हुक इम्पोर्ट करें
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast'; // यदि आपके पास यह टोस्ट हुक है
import { ShoppingBag, ShieldQuestion, AlertTriangle, RefreshCw, Mail, ExternalLink, CheckCircle, User as UserIcon } from 'lucide-react'; // सभी आवश्यक आइकन्स इम्पोर्ट करें
import { checkBrowserCompatibility, AuthError, User as FirebaseUserType } from '@/lib/firebase'; // firebase.ts से इम्पोर्ट करें

// यदि आपके पास Loading, Error, Success कंपोनेंट्स अलग से नहीं हैं, तो उन्हें यहीं परिभाषित कर सकते हैं
// या फिर आप उन्हें Replit के अनुसार अलग फाइलों में बना सकते हैं।
// सादगी के लिए, मैं इन्हें यहीं इनलाइन उदाहरणों के रूप में प्रदान कर रहा हूं।

// --- LoadingState Component (Replit से पोर्टेड) ---
const LoadingState: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
        <CardContent className="text-center p-0">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            {/* यह एक साधारण स्पिनर है, आप अपने Loading कंपोनेंट को यहां इम्पोर्ट कर सकते हैं */}
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-600 mb-2">Signing You In</h2>
          <p className="text-neutral-400 mb-6">Please wait while we authenticate your account...</p>
          <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out animate-pulse" 
              style={{ width: '60%' }} // यह सिर्फ एक विज़ुअल इफेक्ट है
            />
          </div>
          <p className="text-sm text-neutral-400">Redirecting to Google or processing...</p>
        </CardContent>
      </Card>
    </div>
  );
};

// --- ErrorState Component (Replit से पोर्टेड) ---
interface ErrorStateProps {
  error: AuthError;
  onRetry: () => void;
  onEmailSignIn: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, onEmailSignIn }) => {
  const isThirdPartyBlocked = error.code === 'auth/web-storage-unsupported' || 
                             (error.message && error.message.includes('third-party storage')) ||
                             (error.details && error.details.includes('Third-party storage'));

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
        <CardContent className="text-center p-0">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Authentication Failed</h2>
          <p className="text-neutral-400 mb-6">
            We encountered an issue while signing you in. Please try again.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="text-sm text-red-600 font-medium mb-2">
              Error Details:
            </div>
            <div className="text-sm text-red-500">
              {error.message}
            </div>
            {error.details && (
              <div className="text-xs text-red-400 mt-2">
                {error.details}
              </div>
            )}
          </div>

          <Button
            onClick={onRetry}
            className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-secondary transition-all duration-200 mb-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-neutral-400 mb-3">Having trouble? Try these alternatives:</p>
            <div className="space-y-2">
              {isThirdPartyBlocked && (
                <Button
                  variant="outline"
                  className="w-full bg-neutral-100 text-neutral-600 py-2 px-4 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                  onClick={() => window.open('https://support.google.com/chrome/answer/95647', '_blank')} // Chrome help link
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Fix Browser Settings
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onEmailSignIn}
                className="w-full bg-neutral-100 text-neutral-600 py-2 px-4 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                Sign in with Email
              </Button>
            </div>
          </div>

          {isThirdPartyBlocked && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left">
              <div className="text-sm text-blue-600">
                <strong>Browser Settings Help:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• <strong>Chrome:</strong> Settings → Privacy → Cookies → Allow all cookies</li>
                  <li>• <strong>Firefox:</strong> Settings → Privacy → Standard protection</li>
                  <li>• <strong>Safari:</strong> Settings → Privacy → Disable "Prevent cross-site tracking"</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// --- SuccessState Component (Replit से पोर्टेड) ---
interface SuccessStateProps {
  user: FirebaseUserType; // firebase.ts से UserType
  onContinue: () => void;
}

const SuccessState: React.FC<SuccessStateProps> = ({ user, onContinue }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white rounded-2xl shadow-xl border border-green-200 p-8">
        <CardContent className="text-center p-0">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Welcome Back!</h2>
          <p className="text-neutral-400 mb-6">
            You have successfully signed in to your account.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-green-700">
                  {user.displayName || 'User'}
                </p>
                <p className="text-sm text-green-600">{user.email}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onContinue}
            className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-secondary transition-all duration-200"
          >
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// --- LoginForm Component (Replit से पोर्टेड) ---
interface LoginFormProps {
  handleGoogleSignIn: (usePopup: boolean) => Promise<void>;
  handleEmailSignIn: (e: React.FormEvent) => void;
  isLoading: boolean;
  showCompatibilityWarning: boolean;
  currentDomain: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  handleGoogleSignIn, 
  handleEmailSignIn, 
  isLoading, 
  showCompatibilityWarning, 
  currentDomain 
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white rounded-2xl shadow-xl border border-neutral-200 animate-fade-in">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldQuestion className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-neutral-600 mb-2">
            Welcome Back
          </CardTitle>
          <p className="text-neutral-400">Sign in to your account to continue</p>
        </CardHeader>
        
        <CardContent className="p-8 pt-0">
          {/* Google Sign-in Button (Redirect/Default) */}
          <Button
            onClick={() => handleGoogleSignIn(false)}
            disabled={isLoading}
            className="w-full bg-white border-2 border-neutral-200 text-neutral-600 font-medium py-3 px-4 rounded-xl hover:border-primary hover:bg-neutral-50 transition-all duration-200 flex items-center justify-center space-x-3 group mb-4"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="group-hover:text-primary transition-colors">
              {isLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </Button>

          {/* Popup Sign-in Alternative */}
          <Button
            onClick={() => handleGoogleSignIn(true)}
            disabled={isLoading}
            className="w-full bg-neutral-100 border border-neutral-300 text-neutral-600 font-medium py-2 px-4 rounded-lg hover:bg-neutral-200 transition-all duration-200 flex items-center justify-center space-x-2 mb-6"
            variant="outline"
            size="sm"
          >
            <span className="text-sm">Having trouble? Try popup sign-in</span>
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-400">Or continue with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-neutral-500 mb-2">
                Email Address
              </Label>
              <Input
                type="email"
                required
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-neutral-500 mb-2">
                Password
              </Label>
              <Input
                type="password"
                required
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm text-neutral-500">
                  Remember me
                </Label>
              </div>
              <a href="#" className="text-sm text-primary hover:text-secondary transition-colors">
                Forgot password?
              </a>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-secondary transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Sign In
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-neutral-400 mb-2">
              Don't have an account?{' '}
              <a href="#" className="text-primary hover:text-secondary font-medium transition-colors">
                Sign up
              </a>
            </p>
            <p className="text-neutral-400">
              Want to sell products?{' '}
              <a href="/seller-register" className="text-primary hover:text-secondary font-medium transition-colors">
                Become a Seller
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Firebase Setup Information */}
      <Card className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 mt-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Firebase Setup Required
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              To enable Google login, add this domain to Firebase authorized domains:
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono text-blue-800 block mb-2">
              {currentDomain}
            </code>
            <p className="text-xs text-blue-600">
              Go to Firebase Console → Authentication → Settings → Authorized domains and add the above URL.
            </p>
          </div>
        </div>
      </Card>

      {/* Browser Compatibility Warning */}
      {showCompatibilityWarning && (
        <Card className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-500 mt-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                Browser Compatibility Notice
              </h3>
              <p className="text-sm text-yellow-700">
                Your browser may block third-party storage access. For the best experience, please ensure cookies are enabled or try using a different browser.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};


// --- Main AuthPage Component ---
export default function AuthPage() {
  const { user, isLoadingAuth, isAuthenticated, error, clearError, signIn } = useAuth();
  const navigate = useNavigate(); // react-router-dom से useNavigate
  const location = useLocation(); // react-router-dom से useLocation
  const { toast } = useToast(); // टोस्ट नोटिफिकेशंस के लिए
  
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');

  // Firebase Authorized Domain के लिए वर्तमान डोमेन प्राप्त करें
  useEffect(() => {
    setCurrentDomain(window.location.origin);
    console.log('Current domain for Firebase auth:', window.location.origin);
    
    // ब्राउज़र संगतता जांच करें
    const { isCompatible, warnings } = checkBrowserCompatibility();
    if (!isCompatible || warnings.length > 0) {
      setShowCompatibilityWarning(true);
      warnings.forEach(warning => toast({
        title: "Browser Warning",
        description: warning,
        variant: "warning",
      }));
    }
  }, [toast]);

  // प्रमाणीकरण सफल होने पर रीडायरेक्ट करें
  useEffect(() => {
    console.log("AuthPage useEffect: Triggered. Auth State:", { isLoadingAuth, isAuthenticated, user });

    if (isAuthenticated && !isLoadingAuth && user) {
      setShowSuccessState(true); // सक्सेस स्टेट दिखाएं

      const redirectIntent = localStorage.getItem("redirectIntent");
      const timer = setTimeout(() => {
        localStorage.removeItem("redirectIntent"); // इंटेंट को हटा दें

        if (redirectIntent === "become-seller") {
          navigate("/seller-apply", { replace: true });
          console.log("AuthPage useEffect: Authenticated with 'become-seller' intent. Redirecting to /seller-apply.");
        } else {
          navigate("/", { replace: true });
          console.log("AuthPage useEffect: Authenticated without specific intent. Redirecting to /.");
        }
      }, 2000); // 2 सेकंड बाद रीडायरेक्ट

      return () => clearTimeout(timer); // क्लीनअप
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  // Google साइन-इन हैंडलर
  const handleGoogleSignIn = async (usePopup: boolean = false) => {
    clearError(); // कोई भी पुरानी एरर क्लियर करें
    try {
      console.log(`AuthPage: Attempting Google sign-in with ${usePopup ? 'popup' : 'redirect'}...`);
      await signIn(usePopup); // useAuth हुक से signIn फ़ंक्शन को कॉल करें

      // यदि पॉपअप सफल होता है, तो `signIn` तुरंत user ऑब्जेक्ट देगा
      // यदि रीडायरेक्ट होता है, तो यह यहीं null लौटाएगा और `onAuthStateChanged` इसे बाद में संभालेगा
      // UI State Management useAuth().isLoadingAuth और useAuth().error पर निर्भर करेगा
    } catch (err: any) {
      console.error("AuthPage: Google sign-in failed:", err);
      // एरर useAuth हुक द्वारा सेट की जाएगी और ErrorState कंपोनेंट द्वारा प्रदर्शित की जाएगी
    }
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preve
