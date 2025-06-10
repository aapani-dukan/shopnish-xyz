// Client/src/components/auth-redirect-guard.tsx
import { useEffect } from 'react';
import { useLocation } from 'wouter'; // assuming you're using wouter for routing
import { useAuth } from '@/hooks/useAuth'; // Your centralized auth hook

export default function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 1. जब ऑथेंटिकेशन लोड हो रहा हो, तो कुछ न करें
    if (loading) {
      return;
    }

    // 2. लॉगिन भूमिका देखें (यदि यह एक विशेष लॉगिन प्रवाह से आया है)
    const loginRole = sessionStorage.getItem("loginRole");

    // 3. यदि यूजर लॉग इन है
    if (user) {
      // यदि यह एक विशेष लॉगिन फ्लो है (जैसे "Become a Seller")
      if (loginRole === "seller") {
        // एक बार जब हम रीडायरेक्ट कर देते हैं, तो sessionStorage फ्लैग हटा दें
        sessionStorage.removeItem("loginRole"); 

        if (user.role === "approved-seller") {
          // यदि सेलर अप्रूव्ड है, तो डैशबोर्ड पर भेजें
          setLocation("/seller-dashboard"); // सुनिश्चित करें कि यह आपका सही डैशबोर्ड URL है
          return; // रीडायरेक्ट के बाद फंक्शन से बाहर निकलें
        } else if (user.role === "not-approved-seller") {
          // यदि सेलर अप्रूव्ड नहीं है, तो रजिस्ट्रेशन फॉर्म पर भेजें
          setLocation("/seller-registration-form"); // सुनिश्चित करें कि यह आपका सही रजिस्ट्रेशन फॉर्म URL है
          return; // रीडायरेक्ट के बाद फंक्शन से बाहर निकलें
        }
        // यदि 'seller' loginRole है लेकिन role 'approved-seller' या 'not-approved-seller' नहीं है,
        // तो यह एक अनपेक्षित स्थिति है। आप यहाँ एक डिफ़ॉल्ट रीडायरेक्ट कर सकते हैं।
        // फिलहाल इसे यहीं छोड़ते हैं, यह सामान्य हैंडलिंग पर गिरेगा।
      } 
      // यदि loginRole 'seller' नहीं है, तो यह एक सामान्य लॉगिन या डिफ़ॉल्ट यूजर है।
      // आप यहाँ अन्य भूमिकाओं या डिफ़ॉल्ट रीडायरेक्ट को संभाल सकते हैं।
      // उदाहरण: यदि यूजर लॉग इन है लेकिन किसी विशिष्ट फ्लो में नहीं है, तो उसे होम पेज पर भेजें या जहाँ वह होना चाहिए।
      // वर्तमान में, यह कॉम्पोनेंट केवल बच्चों को रेंडर करेगा यदि कोई विशिष्ट रीडायरेक्ट नहीं होता है।
      
    } else {
      // यदि यूजर लॉग आउट है (और 'loginRole' नहीं है)
      // आप यहाँ सामान्य यूजर्स को लॉगिन पेज पर रीडायरेक्ट कर सकते हैं
      // उदाहरण: if (!location.startsWith('/login')) setLocation('/login');
    }
  }, [user, loading, setLocation]); // dependencies: user, loading, setLocation

  // जब तक लोडिंग न हो जाए या रीडायरेक्ट न हो जाए तब तक कुछ भी रेंडर न करें
  if (loading) {
    return <div>Loading authentication...</div>; // या कोई स्पिनर
  }

  // यदि कोई रीडायरेक्ट नहीं होता है, तो बच्चे के कॉम्पोनेंट रेंडर करें
  return <>{children}</>;
}
