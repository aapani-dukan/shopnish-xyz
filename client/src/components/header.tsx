// Header.tsx
import React from "react";
import { useCartStore } from "@/lib/store";
import CartModal from "./cart-modal";
import { Link, useLocation } from "wouter";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // ✅ Import initiateGoogleSignInRedirect
import { useAuth } from "@/hooks/useAuth"; // ✅ Import useAuth to check if user is logged in

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
  const { user } = useAuth(); // ✅ Get user from useAuth hook

  // 📦 'Become a Seller' बटन के लिए हैंडलर
  const handleBecomeSeller = async () => {
    if (user) {
      // यदि यूजर पहले से लॉग इन है, तो उसे सीधे विक्रेता ऑनबोर्डिंग पेज पर भेजें
      // या, यदि वह पहले से विक्रेता है, तो उसके डैशबोर्ड पर भेजें।
      // आपको यहाँ अपनी विक्रेता ऑनबोर्डिंग लॉजिक के आधार पर रीडायरेक्ट पाथ निर्धारित करना होगा।
      // मान लीजिए कि /seller-apply आपका विक्रेता आवेदन पेज है।
      console.log("User is already logged in, navigating to seller application.");
      navigate("/seller-apply"); // या /seller-dashboard यदि वह पहले से विक्रेता है
    } else {
      // यदि यूजर लॉग इन नहीं है, तो Google रीडायरेक्ट साइन-इन प्रक्रिया शुरू करें
      console.log("User is not logged in, initiating Google Sign-In Redirect for seller.");
      try {
        await initiateGoogleSignInRedirect();
        // signInWithRedirect के बाद, ब्राउज़र रीडायरेक्ट होगा।
        // AuthRedirectGuard और useAuth.tsx का onAuthStateChanged हैंडलर बाकी काम करेगा।
      } catch (error) {
        console.error("Error during Google Sign-In Redirect:", error);
        // उपयोगकर्ता को त्रुटि दिखाएं
      }
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

        {/* ✅ 'Become a Seller' बटन अब handleBecomeSeller को कॉल करेगा */}
        <button
          onClick={handleBecomeSeller} // ✅ Updated to call the new handler
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Become a Seller
        </button>
      </div>

      <CartModal isOpen={isCartOpen} onClose={toggleCart} />
    </header>
  );
};

export default Header;
