import { useState, useEffect } from "react"; // ✅ useEffect को इम्पोर्ट करें
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithRedirect, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth"; // ✅ onAuthStateChanged और FirebaseUser को इम्पोर्ट करें
import axios from "axios";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null); // ✅ Firebase यूज़र स्टेट
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true); // ✅ Firebase लोडिंग स्टेट

  // ✅ Firebase ऑथेंटिकेशन स्थिति को हैंडल करने के लिए useEffect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false); // Firebase स्थिति अब ज्ञात है
    });

    return () => unsubscribe(); // क्लीनअप
  }, []);

  const handleFirebaseSignIn = async () => {
    setLoading(true); // बटन को अक्षम करें
    try {
      // ✅ सीधा Firebase साइन-इन, कोई पासवर्ड चेक नहीं
      await signInWithRedirect(auth, googleProvider);
      // signInWithRedirect के बाद, यह कोड निष्पादित नहीं होता है
      // यूज़र को रीडायरेक्ट किया जाएगा और फिर वापस आएगा।
    } catch (error: any) {
      console.error("Firebase sign-in error:", error);
      toast({
        title: "Firebase Sign-in Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleAdminPasswordLogin = async () => {
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter admin password.", // मैसेज अपडेट किया
        variant: "destructive",
      });
      return;
    }

    if (!firebaseUser) {
      // यह स्थिति नहीं होनी चाहिए अगर UI सही ढंग से सशर्त है
      toast({
        title: "Error",
        description: "Firebase user not authenticated. Please sign in with Google first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("/api/admin-login", {
        firebaseUid: firebaseUser.uid, // ✅ firebaseUser.uid का उपयोग करें
        password,
      });

      localStorage.setItem("isAdmin", "true");
      setLocation("/admin-dashboard");
    } catch (err: any) {
      console.error("Admin backend login error:", err);
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || "Invalid login credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isFirebaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Panel Login</CardTitle>
          <p className="text-muted-foreground">Sign in with Google and enter password</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!firebaseUser ? ( // ✅ यदि Firebase यूज़र लॉग इन नहीं है
            <Button className="w-full" onClick={handleFirebaseSignIn} disabled={loading}>
              {loading ? "Redirecting to Google..." : "Sign in with Google"}
            </Button>
          ) : ( // ✅ यदि Firebase यूज़र लॉग इन है
            <>
              <p className="text-sm text-center text-gray-700">Logged in as: **{firebaseUser.email}**</p> {/* ✅ यूज़र ईमेल दिखाएं */}
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button className="w-full" onClick={handleAdminPasswordLogin} disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={async () => {
                  setLoading(true);
                  await signOut(auth);
                  setLoading(false);
                  toast({
                    title: "Signed Out",
                    description: "You have been signed out from Google.",
                  });
                }}
                disabled={loading}
              >
                Sign out Google Account
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
