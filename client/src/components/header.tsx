// Header.tsx
import React from "react";
import { useCartStore } from "@/lib/store";
import CartModal from "./cart-modal";
import { Link, useLocation } from "wouter";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; 
import { useAuth } from "@/hooks/useAuth"; 

interface Category {
  id: string;
  name: string;
}

interface HeaderProps {
  categories: Category[];
}

const Header: React.FC<HeaderProps> = ({ categories }) => {
  const { items, isCartOpen, toggleCart } = useCartStore();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoadingAuth } = useAuth(); 

  // 'Become a Seller' बटन के लिए हैंडलर
  const handleBecomeSeller = async () => {
    // 1. पहले जांचें कि ऑथेंटिकेशन अभी लोड हो रहा है या नहीं
    if (isLoadingAuth) {
      console.log("Header: Auth state still loading, please wait for 'Become a Seller' click.");
      // यूजर को कोई UI फीडबैक दें, जैसे लोडिंग स्पिनर या बटन को डिसेबल रखना (जो पहले से है)
      return; 
    }

    // 2. यदि यूज़र लॉग इन नहीं है (isAuthenticated false है)
    if (!isAuthenticated) {
      console.log("Header: User is not logged in. Initiating Google Sign-In Redirect with intent.");
      try {
        // Google Sign-in Redirect चालू करें, और URL में intent जोड़ें
        // ताकि लॉगिन के बाद AuthRedirectGuard इसे पढ़ सके।
        await initiateGoogleSignInRedirect("become-seller"); 
        // initiateGoogleSignInRedirect को intent पैरामीटर लेने के लिए अपडेट करना होगा
        // इस बिंदु पर, ब्राउज़र Google के लॉगिन पेज पर रीडायरेक्ट हो जाएगा।
        // जब यूजर वापस आएगा, तो onAuthStateChanged (useAuth में) और AuthRedirectGuard उसे सही जगह भेजेंगे।
      } catch (error) {
        console.error("Header: Error during Google Sign-In Redirect:", error);
        // त्रुटि हैंडलिंग, जैसे टोस्ट दिखाना
      }
    } else {
      // 3. यदि यूज़र पहले से लॉग इन है (isAuthenticated true है)
      console.log("Header: User is already logged in. Determining seller path based on role and status.");
      let sellerTargetPath: string;

      // यूजर की भूमिका के आधार पर अपेक्षित सेलर पाथ निर्धारित करें
      if (user?.role === "seller") { // 'user?' का उपयोग करें क्योंकि user null हो सकता है
        const approvalStatus = user.seller?.approvalStatus; // 'user.seller?' का उपयोग करें
        if (approvalStatus === "approved") {
          sellerTargetPath = "/seller-dashboard";
        } else if (approvalStatus === "pending") {
          sellerTargetPath = "/seller-status";
        } else { // 'rejected' या 'customer' जिसने अभी तक अप्लाई नहीं किया
          sellerTargetPath = "/seller-apply";
        }
      } else {
        // यदि यूजर 'customer' या कोई अन्य भूमिका है, तो उसे अप्लाई करने के लिए भेजें
        sellerTargetPath = "/seller-apply";
      }

      console.log(`Header: Redirecting logged-in user to: ${sellerTargetPath}`);
      // लॉग-इन यूजर को सीधे उसके अपेक्षित विक्रेता पेज पर नेविगेट करें।
      // हमें यहां URL में 'intent' जोड़ने की आवश्यकता नहीं है, क्योंकि AuthRedirectGuard
      // अब लॉग-इन यूजर के लिए इंटेंट को पहले ही हैंडल कर चुका है (अगर वह /auth से आया है)।
      // यहां हम सीधे सही जगह भेज रहे हैं।
      navigate(sellerTargetPath); 
    }
  };

  return (
    <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">
        Shopnish
      </Link>

      <nav className="space-x-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.id}`}
            className="text-gray-700 hover:text-blue-600"
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleCart}
          className="relative text-gray-700 hover:text-blue-600"
        >
          🛒
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>

        {/* Updated: Become a Seller Button */}
        <button
          onClick={handleBecomeSeller}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          // isLoadingAuth के दौरान बटन को डिसेबल करें ताकि यूजर क्लिक न कर सके जब तक ऑथ स्टेटस क्लियर न हो
          disabled={isLoadingAuth} 
        >
          {isLoadingAuth ? "Loading Auth..." : "Become a Seller"}
        </button>
      </div>

      <CartModal isOpen={isCartOpen} onClose={toggleCart} />
    </header>
  );
};

export default Header;
