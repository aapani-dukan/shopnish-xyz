// Header.tsx
import React from "react";
import { Link } from "wouter";

import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";

import CartModal from "./cart-modal";

interface Category {
  id: string;
  name: string;
}

interface HeaderProps {
  categories: Category[];
}

const Header: React.FC<HeaderProps> = ({ categories }) => {
  const { items, isCartOpen, toggleCart } = useCartStore();
  const { user } = useAuth();               // 🔑 हमारा लॉग-इन यूज़र

  // 👉 Seller बटन का नया logic
  const handleBecomeSeller = () => {
    if (!user) return;                      // extra safety, पर हूम पेज तक no-login आता नहीं
    if (user.isApprovedSeller) {
      window.location.href = "/seller-dashboard";
    } else {
      window.location.href = "/seller-apply";
    }
  };

  return (
    <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
      {/* Logo / Home */}
      <Link href="/" className="text-xl font-bold text-blue-600">
        Shopnish
      </Link>

      {/* Category links */}
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

      {/* Cart + Become-Seller */}
      <div className="flex items-center space-x-4">
        {/* Cart */}
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

        {/* Become a Seller */}
        <button
          onClick={handleBecomeSeller}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Become a Seller
        </button>
      </div>

      {/* Cart modal */}
      <CartModal isOpen={isCartOpen} onClose={toggleCart} />
    </header>
  );
};

export default Header;
