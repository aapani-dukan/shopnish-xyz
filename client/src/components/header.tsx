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

  const handleBecomeSeller = () => {
    if (isLoadingAuth) {
      console.log("Header: Auth state still loading, please wait for 'Become a Seller' click.");
      return; 
    }

    if (!isAuthenticated) {
      console.log("Header: User is not logged in. Storing intent and redirecting to auth page.");
      // ✅ localStorage में intent को स्टोर करें
      localStorage.setItem('redirectIntent', 'become-seller'); // <--- यह नई लाइन है
      navigate("/auth"); // अब हम सिर्फ /auth पर भेजेंगे, intent URL में नहीं होगा
                        // AuthPage पर भी intent को URL से पढ़ने की जरूरत नहीं, localStorage से मिलेगा।
    } else {
      // ✅ यह लॉजिक पहले से सही है, इसमें कोई बदलाव नहीं।
      console.log("Header: User is already logged in. Determining seller path based on role and status.");
      let sellerTargetPath: string;
      if (user?.role === "seller") { 
        const approvalStatus = user.seller?.approvalStatus;
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
      console.log(`Header: Redirecting logged-in user to: ${sellerTargetPath}`);
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
