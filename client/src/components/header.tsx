// Header.tsx
import React from "react";
import { useCartStore } from "@/lib/store";
import CartModal from "./cart-modal";
import { Link, useLocation } from "wouter";

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

        {/* 👇 Only navigates to Auth Page */}
        <button
          onClick={() => navigate("/login")}
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
