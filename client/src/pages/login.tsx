// client/src/pages/login.tsx

import { useEffect } from "react";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth"; // getRedirectResult इम्पोर्ट करें
import { app } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter"; // wouter से useLocation इम्पोर्ट करें

export default function Login() {
  const auth = getAuth(app);
  const [, setLocation] = useLocation(); // रीडायरेक्शन के लिए setLocation

  useEffect(() => {
    // Google लॉगिन रीडायरेक्ट के परिणाम को हैंडल करें
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // यूजर सफलतापूर्वक लॉग इन हो गया है
          console.log("🟢 Google login redirect result:", result.user);

          // sessionStorage से loginRole फ्लैग की जांच करें
          const loginRole = sessionStorage.getItem("loginRole");
          sessionStorage.removeItem("loginRole"); // फ्लैग का उपयोग करने के बाद हटा दें

          if (loginRole === "seller") {
            // अगर यूजर सेलर रजिस्ट्रेशन के लिए आया था, तो उसे रजिस्ट्रेशन पेज पर भेजें
            setLocation("/register-seller");
          } else {
            // अन्यथा, उसे होम पेज पर भेजें
            setLocation("/");
          }
        } else {
          // अगर यूजर पहले से लॉग इन है (या रीडायरेक्ट से नहीं आया है)
          // तो हम 'onAuthStateChanged' लिसनर पर भरोसा कर सकते हैं
          // जो नीचे है, या सीधे होम पर भेज सकते हैं अगर कोई specific flow नहीं है।
          // अभी के लिए, onAuthStateChanged को इसे हैंडल करने दें।
          console.log("🟡 No redirect result or user already signed in.");
        }
      } catch (error) {
        console.error("🔴 Error during Google sign-in redirect result:", error);
        // एरर होने पर भी यूजर को होम पर भेज दें
        setLocation("/");
      }
    };

    handleRedirectResult();

    // पहले से लॉग इन हो तो, onAuthStateChanged लिसनर का उपयोग करें
    // यह `getRedirectResult` के बाद भी चलता है, लेकिन सुनिश्चित करता है
    // कि यूजर किसी भी अन्य तरीके से लॉग इन होने पर भी हैंडल हो।
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // सुनिश्चित करें कि यह केवल तभी रीडायरेक्ट करे जब `getRedirectResult` ने पहले से रीडायरेक्ट न किया हो
        // या यदि वे सीधे `login` पेज पर आएं और पहले से लॉग इन हों.
        // `sessionStorage.getItem("loginRole")` की जांच करके हम सुनिश्चित कर सकते हैं
        // कि यह सेलर फ्लो को बाधित न करे।
        if (window.location.pathname === "/login") { // केवल तभी रीडायरेक्ट करें जब वे अभी भी `/login` पर हों
            const loginRole = sessionStorage.getItem("loginRole");
            if (loginRole === "seller") {
                setLocation("/register-seller");
            } else {
                setLocation("/");
            }
        }
      }
    });

    return () => unsubscribe();
  }, [auth, setLocation]); // auth और setLocation को dependencies के रूप में जोड़ें

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    // `startGoogleLogin` अब `firebase.ts` में परिभाषित है
    // तो इस फ़ंक्शन को कॉल करने की आवश्यकता नहीं है, इसे `startGoogleLogin` हैंडल करेगा.
    // लेकिन चूंकि header.tsx सीधे startGoogleLogin को कॉल कर रहा है, तो यह हिस्सा शायद सीधे उपयोग नहीं होगा।
    // फिर भी, अगर आप यहाँ से सीधा लॉगिन ट्रिगर करते हैं तो यह `loginRole` सेट नहीं करेगा।
    // सुनिश्चित करें कि `Become a Seller` फ्लो हमेशा `header.tsx` से ही शुरू हो।
    signInWithRedirect(auth, provider);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome to Shopnish</h1>
        <p className="text-gray-600">Please login with Google to continue</p>

        {/* इस बटन को `startGoogleLogin` को कॉल करना चाहिए ताकि `loginRole` सेट हो सके,
            या इसे केवल सामान्य लॉगिन के लिए उपयोग करें।
            अगर यह केवल सामान्य लॉगिन है, तो `startGoogleLogin` को कॉल न करें।
            अभी के लिए, यह वही करता है जो पहले करता था। */}
        <Button onClick={handleLogin}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
