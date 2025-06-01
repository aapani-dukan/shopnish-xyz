import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Heart, ShoppingCart, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";
import CartModal from "./cart-modal";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories: Category[];
}

export default function Header({ categories }: HeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const totalItems = useCartStore(state => state.getTotalItems());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Header */}
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-neutral-900 cursor-pointer">
                  Shopnish
                </h1>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search products, brands, and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0 h-auto bg-transparent hover:bg-transparent text-gray-400 hover:text-primary"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-6">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                <Heart className="h-5 w-5" />
                <span className="sr-only">Wishlist</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="relative text-gray-600 hover:text-primary"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center p-0">
                    {totalItems}
                  </Badge>
                )}
                <span className="sr-only">Shopping cart</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                <User className="h-5 w-5" />
                <span className="sr-only">Account</span>
              </Button>
            </div>
          </div>

          {/* Category Navigation */}
          <nav className="hidden lg:flex border-t border-gray-200 py-4">
            <div className="flex space-x-8">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/?category=${category.id}`}
                  className="text-gray-700 hover:text-primary font-medium transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
