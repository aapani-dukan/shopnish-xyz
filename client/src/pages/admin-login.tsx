// Client/src/pages/admin-login.tsx
import { useState, useEffect } from "react"; // useState और useEffect दोनों इम्पोर्टेड हैं
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // अगर इस्तेमाल नहीं कर रहे तो हटा सकते हैं
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // अगर इस्तेमाल नहीं कर रहे तो हटा सकते हैं
import { Shield } from "lucide-react"; // Lock आइकन की ज़रूरत नहीं होगी
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // अगर यूज़र ऑथेंटिकेटेड है और एडमिन है, तो सीधे डैशबोर्ड पर ले जाएँ
    if (!isLoading && user?.isAdmin) {
      setLocation("/admin-dashboard");
      return; // यहाँ से बाहर निकलें ताकि आगे का लॉजिक न चले
    }

    // अगर यूज़र ऑथेंटिकेटेड है लेकिन एडमिन नहीं है, तो एक्सेस डिनाइड दिखाएँ और होम पर रीडायरेक्ट करें
    if (!isLoading && user && !user.isAdmin) {
      toast({
        title: "Access Denied",
        description: "आपको एडमिन के अधिकार नहीं हैं।",
        variant: "destructive",
      });
      setLocation("/");
      return; // यहाँ से बाहर निकलें
    }

    // अगर यूज़र लोड हो रहा है या ऑथेंटिकेटेड नहीं है, तो कुछ न करें
    // और एडमिन लॉगिन पेज को डिस्प्ले होने दें ताकि "Enter Admin Panel" बटन दिखे।
  }, [user, isLoading, setLocation, toast]);

  // सीधे एडमिन डैशबोर्ड पर जाने के लिए एक फंक्शन
  const handleEnterAdminPanel = () => {
    setLocation("/admin-dashboard");
  };

  // लोडिंग स्टेट के लिए
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">एडमिन एक्सेस</CardTitle>
          <p className="text-muted-foreground">
            विक्रेता और उत्पाद प्रबंधन के लिए सुरक्षित एडमिन पैनल
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* पुराने Google लॉगिन बटन की जगह नया बटन */}
            <Button 
              onClick={handleEnterAdminPanel}
              className="w-full"
              size="lg"
            >
              एडमिन पैनल में प्रवेश करें
            </Button>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            केवल अधिकृत प्रशासक ही इस पैनल तक पहुँच सकते हैं।
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
