// client/src/components/auth-redirect-guard.tsx
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function AuthRedirectGuard() {
const [location, navigate] = useLocation();
const { user, loading } = useAuth();

useEffect(() => {
if (loading) return;

// ✅ Public routes – allow access without login  
const publicPaths = ["/", "/product", "/cart", "/checkout"];  
const isPublic = publicPaths.some((path) =>  
  location.startsWith(path)  
);  

if (isPublic) return;  

// 🔒 Redirect logic  
if (!user) {  
  navigate("/login");  
  return;  
}  

// ✅ Seller redirect logic  
if (user.role === "seller") {  
  if (user.seller?.approvalStatus === "approved") {  
    if (!location.startsWith("/seller-dashboard")) {  
      navigate("/seller-dashboard");  
    }  
  } else {  
    if (!location.startsWith("/register-seller")) {  
      navigate("/register-seller");  
    }  
  }  
  return;  
}  

// ✅ Admin redirect logic (optional)  
if (user.role === "admin" && !location.startsWith("/admin-dashboard")) {  
  navigate("/admin-dashboard");  
  return;  
}  

// ✅ Delivery redirect logic (optional)  
if (user.role === "delivery" && !location.startsWith("/delivery-dashboard")) {  
  navigate("/delivery-dashboard");  
  return;  
}  

// ✅ Default fallback for customers or unknown roles  
if (!location.startsWith("/")) {  
  navigate("/");  
}

}, [user, loading, location, navigate]);

return null;
}
