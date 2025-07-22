// src/guards/AuthRedirectGuard.tsx

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ wouter से react-router-dom में बदलें

// सार्वजनिक पथों की सूची
const PUBLIC_PATHS = [
"/",
"/product/",
"/cart",
"/checkout",
// अन्य सार्वजनिक पथ यहाँ जोड़ें
];

// लॉगिन/Firebase handler जैसे स्पेशल ऑथ पाथ
const AUTH_SPECIFIC_PATHS = [
"/auth",
"/login",
"/admin-login",
// "/__/auth/handler", // Firebase Auth handler path, if used, अब इसकी जरूरत कम है क्योंकि Firebase इसे सीधे संभालता है
];

export function AuthRedirectGuard() {
const navigate = useNavigate(); // ✅ react-router-dom से useNavigate
const location = useLocation(); // ✅ react-router-dom से useLocation
const intent = localStorage.getItem('redirectIntent');
const { user, isLoadingAuth, isAuthenticated } = useAuth();

useEffect(() => {
console.group("AuthRedirectGuard Log");
console.log("AuthRedirectGuard useEffect triggered.");
console.log("isLoadingAuth:", isLoadingAuth);
console.log("isAuthenticated:", isAuthenticated);
console.log("Current user (UID):", user?.uid || "null"); // UID को UID में बदलें, UUID नहीं
console.log("Current location:", location.pathname); // ✅ .pathname का उपयोग करें
console.log("Intent from localStorage:", intent);

// Step 1: प्रमाणीकरण लोड होने तक प्रतीक्षा करें
if (isLoadingAuth) {
console.log("AuthRedirectGuard: Still loading auth, returning.");
console.groupEnd();
return;
}

// कुछ उपयोगी फ्लैग्स
const currentPath = location.pathname; // ✅ location.pathname का उपयोग करें
const isOnPublicPath = PUBLIC_PATHS.some(
(path) => currentPath === path || (path.endsWith("/") ? currentPath.startsWith(path) : currentPath.startsWith(path + '/'))
);
const isOnAuthSpecificPath = AUTH_SPECIFIC_PATHS.some(
(path) => currentPath === path || currentPath.startsWith(path + '/') || currentPath.includes(path)
);

// --- ✅ प्राथमिकता 1: 'become-seller' इंटेंट को हैंडल करें ---
if (intent === "become-seller") {
console.log("AuthRedirectGuard: 'become-seller' intent found.");

// यदि यूज़र लॉग इन नहीं है और 'become-seller' इंटेंट है, तो उसे /auth पर भेजें
// ताकि वह पहले लॉग इन कर सके और फिर हम उसे /seller-apply पर भेज सकें
if (!isAuthenticated) {
console.log("AuthRedirectGuard: Not authenticated with 'become-seller' intent. Redirecting to /auth.");
// हम intent को localStorage में रखेंगे ताकि लॉगिन के बाद उसे पकड़ा जा सके
navigate("/auth", { replace: true });
console.groupEnd();
return;
}

// यदि यूज़र लॉग इन है और 'become-seller' इंटेंट है
if (isAuthenticated) {
// हम उम्मीद करते हैं कि AuthPage.tsx (लॉगिन के बाद) इस इंटेंट को हैंडल करेगा
// और /seller-apply पर रीडायरेक्ट करेगा।
// यह गार्ड केवल यह सुनिश्चित करेगा कि यदि उपयोगकर्ता पहले से ही seller-apply पर है
// और उसका रोल या स्टेटस ठीक नहीं है तो उसे सही जगह भेजा जाए।

const approvalStatus = user?.seller?.approvalStatus;    
let sellerTargetPath: string;    

if (user?.role === "seller") {    
  if (approvalStatus === "approved") {    
    sellerTargetPath = "/seller-dashboard";    
  } else if (approvalStatus === "pending") {    
    sellerTargetPath = "/seller-status";    
  } else {     
    sellerTargetPath = "/seller-apply";     
  }    
} else {    
  sellerTargetPath = "/seller-apply";     
}    
    
// यदि यूज़र पहले से ही सही सेलर पाथ पर नहीं है, तो रीडायरेक्ट करें    
if (currentPath !== sellerTargetPath && !currentPath.startsWith(sellerTargetPath + '/')) {    
  console.log(`AuthRedirectGuard: Logged in with 'become-seller' intent, redirecting to designated seller path: ${sellerTargetPath}`);    
  localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें    
  navigate(sellerTargetPath, { replace: true });    
  console.groupEnd();    
  return;    
}    
console.log("AuthRedirectGuard: User already on correct seller intent path. Staying put.");    
localStorage.removeItem('redirectIntent'); // इंटेंट को उपयोग के बाद हटा दें    
console.groupEnd();     
return;

}
}

// --- अब सामान्य ऑथेंटिकेशन और रीडायरेक्ट लॉजिक (जब कोई 'become-seller' इंटेंट न हो) ---

// --- 🔒 यूज़र लॉगिन नहीं है ---
if (!isAuthenticated) {
console.log("AuthRedirectGuard: User not logged in.");

// यदि यूजर किसी auth-विशिष्ट पाथ पर है (जैसे /auth, /login)
if (isOnAuthSpecificPath) {
console.log("AuthRedirectGuard: Not logged in user on auth-specific path. Staying put.");
console.groupEnd();
return;
}

// यदि यूजर किसी सार्वजनिक पाथ पर है (जैसे /, /product, /cart)
if (isOnPublicPath) {
console.log("AuthRedirectGuard: Not logged in user on public path. Staying put.");
console.groupEnd();
return;
}

// यदि यूजर लॉगिन नहीं है और न ही किसी auth-विशिष्ट या सार्वजनिक पाथ पर है
console.log("AuthRedirectGuard: Not logged in user on restricted non-public path. Redirecting to /auth.");
navigate("/auth", { replace: true });
console.groupEnd();
return;
}

// --- 🔓 यूज़र लॉगिन है (isAuthenticated अब true है और कोई 'become-seller' इंटेंट नहीं था) ---
console.log(
"AuthRedirectGuard: User is logged in. Current role:",
user?.role,
"Approval Status:",
user?.seller?.approvalStatus
);

// ✅ प्राथमिकता 2: यदि यूजर लॉगिन है और 'auth-specific' पेज पर है, तो होम पर भेजें
if (isOnAuthSpecificPath) {
console.log("AuthRedirectGuard: Logged in user on auth-specific page. Redirecting to /.");
navigate("/", { replace: true });
console.groupEnd();
return;
}

// --- रोल-आधारित रीडायरेक्ट लॉजिक ---
let targetPath: string | null = null;

switch (user?.role) {
case "seller": {
const approvalStatus = user.seller?.approvalStatus;
if (approvalStatus === "approved") {
targetPath = "/seller-dashboard";
} else if (approvalStatus === "pending") {
targetPath = "/seller-status";
} else { // seller रोल है लेकिन कोई स्टेटस नहीं या approved/pending नहीं
targetPath = "/seller-apply";
}

// यदि विक्रेता संबंधित पाथ पर नहीं है, तो रीडायरेक्ट करें    
if (!currentPath.startsWith("/seller-") && targetPath && currentPath !== targetPath && !currentPath.startsWith(targetPath + '/')) {    
  console.log(`AuthRedirectGuard: Seller on non-seller path, redirecting to ${targetPath}`);    
  navigate(targetPath, { replace: true });    
  console.groupEnd();    
  return;    
}    
break;

}

case "admin":
targetPath = "/admin-dashboard";
if (!currentPath.startsWith(targetPath)) {
console.log("AuthRedirectGuard: Admin, redirecting to /admin-dashboard.");
navigate(targetPath, { replace: true });
console.groupEnd();
return;
}
break;

case "delivery":
targetPath = "/delivery-dashboard";
if (!currentPath.startsWith(targetPath)) {
console.log("AuthRedirectGuard: Delivery, redirecting to /delivery-dashboard.");
navigate(targetPath, { replace: true });
console.groupEnd();
return;
}
break;

case "customer":
default:
// यदि ग्राहक या अज्ञात भूमिका एक प्रतिबंधित पृष्ठ पर है, तो उसे होम पर रीडायरेक्ट करें
if (
currentPath.startsWith("/seller-") ||
currentPath.startsWith("/admin-") ||
currentPath.startsWith("/delivery-")
) {
console.log("AuthRedirectGuard: Customer or unknown role on restricted page, redirecting to /.");
navigate("/", { replace: true });
console.groupEnd();
return;
}
break;
}

console.log("AuthRedirectGuard: Logged in user on appropriate path, staying put.");
console.groupEnd();

}, [user, isLoadingAuth, isAuthenticated, location.pathname, navigate, intent]);

return null;
}
