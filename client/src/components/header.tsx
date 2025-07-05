// Header.tsx
import React from "react";
import { useCartStore } from "@/lib/store";
import CartModal from "./cart-modal";
import { Link, useLocation } from "wouter";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // initiateGoogleSignInRedirect इम्पोर्ट करें
import { useAuth } from "@/hooks/useAuth"; // useAuth इम्पोर्ट करें

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
  // ✅ isAuthenticated और isLoadingAuth को भी useAuth से प्राप्त करें
  const { user, isAuthenticated, isLoadingAuth } = useAuth(); 

  // 'Become a Seller' बटन के लिए हैंडलर
  const handleBecomeSeller = async () => {
    // पहले जांचें कि ऑथेंटिकेशन अभी लोड हो रहा है या नहीं
    if (isLoadingAuth) {
      console.log("Auth is still loading, please wait.");
      // यूजर को एक टोस्ट या कुछ UI फीडबैक दें
      // आप यहां एक लोडिंग स्पिनर भी दिखा सकते हैं
      return; 
    }

    // ✅ यदि यूज़र लॉग इन नहीं है (यानी isAuthenticated false है)
    if (!isAuthenticated) {
      console.log("User is not logged in, initiating Google Sign-In Redirect for seller application.");
      try {
        // Google Sign-in Redirect चालू करें
        // AuthRedirectGuard और useAuth का useEffect लॉगिन के बाद बाकी का काम संभाल लेंगे
        await initiateGoogleSignInRedirect(); 
        // इस बिंदु पर, ब्राउज़र Google के लॉगिन पेज पर रीडायरेक्ट हो जाएगा।
        // जब यूजर वापस आएगा, तो onAuthStateChanged (useAuth में) और AuthRedirectGuard उसे सही जगह भेजेंगे।
      } catch (error) {
        console.error("Error during Google Sign-In Redirect:", error);
        // त्रुटि हैंडलिंग, जैसे टोस्ट दिखाना
        // setErrorToast("Google Sign-In failed. Please try again."); // उदाहरण
      }
    } else {
      // ✅ यदि यूज़र पहले से लॉग इन है (isAuthenticated true है)
      console.log("User is already logged in, navigating to seller application with intent.");
      // आपके नियम के अनुसार: यदि यूज़र लॉग इन है, तो `AuthRedirectGuard`
      // उसकी भूमिका और स्टेटस (seller approved/pending) के आधार पर
      // उसे सही जगह (dashboard/status/apply) पर रीडायरेक्ट करेगा।
      // हमें बस `intent` के साथ `/seller-apply` पर नेविगेट करना है।
      navigate("/seller-apply?intent=become-seller"); 
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
