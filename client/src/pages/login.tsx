// client/src/pages/login.tsx
"use client";
import React, { useState } from "react";
// import { signInWithGoogle } from "@/lib/firebase"; // ❌ इसकी जगह अब नया फंक्शन इस्तेमाल करें
import { initiateGoogleSignInSmart } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/ui/GoogleIcon";
import { useLocation } from "wouter";

export default function LoginPage() {
const [loading, setLoading] = useState(false);
const [, navigate] = useLocation();

const handleGoogle = async () => {
try {
setLoading(true);

// ✅ यहाँ signInWithGoogle() की जगह initiateGoogleSignInRedirect() इस्तेमाल करें  
  await initiateGoogleSignInSmart();  
    
  // ध्यान दें: initiateGoogleSignInRedirect() ब्राउज़र को रीडायरेक्ट करेगा,  
  // इसलिए इसके बाद का code (जैसे navigate("/")) तुरंत नहीं चलेगा।  
  // AuthRedirectGuard और useAuth.tsx का onAuthStateChanged/handleRedirectResult  
  // यूजर को सही पेज पर भेज देंगे जब वे वापस आएंगे।  

} catch (err) {  
  console.error("Customer login error:", err);  
  alert("Login failed, please try again.");  
} finally {  
  setLoading(false); // यह सुनिश्चित करता है कि लोडिंग बंद हो जाए  
}

};

return (
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
<Button onClick={handleGoogle} disabled={loading}>
<GoogleIcon /> {loading ? "Signing in…" : "Login with Google"}
</Button>
</div>
);
}

