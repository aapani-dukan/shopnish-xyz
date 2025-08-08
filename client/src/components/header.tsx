// src/components/headers/Header.tsx
import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/lib/store";
import { logout } from "@/lib/firebase";
// UI कॉम्पोनेंट्स इम्पोर्ट करें
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ShoppingCart,
  Menu,
  Search,
  User,
  Heart,
  Store,
  LogOut,
  LogIn,
  LayoutDashboard,
  ListOrdered,
} from "lucide-react";
// ✅ SellerOnboardingDialog को इम्पोर्ट करें
import SellerOnboardingDialog from "./seller/SellerOnboardingDialog";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  categories: Category[];
}

const Header: React.FC<HeaderProps> = ({ categories = [] }) => {
  const { items, isCartOpen, toggleCart } = useCartStore();
  const [searchValue, setSearchValue] = useState("");
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  // ✅ नया स्टेट: डायलॉग को नियंत्रित करने के लिए
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);

  const totalItemsInCart = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue("");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Header: User logged out successfully.");
      navigate("/");
      localStorage.removeItem('redirectIntent');
    } catch (error) {
      console.error("Header: Error during logout:", error);
    }
  };

  // ✅ 'Become a Seller' बटन का नया, सशर्त लॉजिक
  const handleSellerButtonClick = () => {
    if (!isAuthenticated) {
      // अगर लॉग इन नहीं है, तो auth पेज पर जाएं
      navigate("/auth", { state: { redirectIntent: "become-seller" } });
    } else {
      // अगर लॉग इन है, तो स्टेटस के आधार पर कार्रवाई करें
      const approvalStatus = user?.sellerProfile?.approvalStatus;
      if (user?.role === "seller" && approvalStatus === "pending") {
        navigate("/seller-status");
      } else if (user?.role === "seller" && approvalStatus === "approved") {
        navigate("/seller-dashboard");
      } else {
        // अगर रोल 'customer' है, या सेलर है लेकिन स्टेटस 'rejected' या 'null' है
        setIsSellerDialogOpen(true);
      }
    }
  };

  const getDashboardLink = () => {
    if (!isAuthenticated || !user) return null;

    switch (user.role) {
      case "seller":
        // ✅ user.sellerProfile का उपयोग करें
        if (user.sellerProfile?.approvalStatus === "approved") {
          return { label: "Seller Dashboard", path: "/seller-dashboard" };
        } else if (user.sellerProfile?.approvalStatus === "pending") {
          return { label: "Seller Status", path: "/seller-status" };
        } else {
          // 'rejected' या 'null' होने पर
          return { label: "Seller Application", path: "/seller-apply" };
        }
      case "admin":
        return { label: "Admin Dashboard", path: "/admin-dashboard" };
      case "delivery":
        return { label: "Delivery Dashboard", path: "/delivery-dashboard" };
      case "customer":
        return { label: "My Orders", path: "/customer/orders" };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();
  
  // ✅ बटन को सशर्त रूप से रेंडर करने के लिए फ़ंक्शन
  const renderSellerButton = () => {
    if (isLoadingAuth) {
      return null;
    }
    
    // अगर उपयोगकर्ता authenticated नहीं है
    if (!isAuthenticated) {
      return (
        <Button onClick={handleSellerButtonClick} variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-50">
          <Store className="mr-2 h-4 w-4" />
          Become a Seller
        </Button>
      );
    }
    
    // अगर उपयोगकर्ता authenticated है
    const approvalStatus = user?.sellerProfile?.approvalStatus;
    
    if (user?.role === "seller" && approvalStatus === "pending") {
      return (
        <Button onClick={handleSellerButtonClick} variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-50">
          <Store className="mr-2 h-4 w-4" />
          View Seller Status
        </Button>
      );
    }
    
    if (user?.role === "seller" && approvalStatus === "approved") {
      return (
        <Button onClick={handleSellerButtonClick} variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-50">
          <Store className="mr-2 h-4 w-4" />
          Go to Seller Dashboard
        </Button>
      );
    }
    
    // डिफ़ॉल्ट रूप से, 'Become a Seller' बटन दिखाएं
    return (
      <Button onClick={handleSellerButtonClick} variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-50">
        <Store className="mr-2 h-4 w-4" />
        Become a Seller
      </Button>
    );
  };
  
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* लोगो */}
        <Link href="/" className="flex items-center text-xl font-bold text-blue-600">
          <Store className="mr-2 h-6 w-6" />
          Shopnish
        </Link>

        {/* डेस्कटॉप सर्च बार */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-grow max-w-md mx-4">
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-l-lg border-r-0 focus-visible:ring-offset-0 focus-visible:ring-0"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Button type="submit" variant="ghost" className="rounded-l-none rounded-r-lg border-l-0">
            <Search className="h-5 w-5" />
          </Button>
        </form>

        {/* डेस्कटॉप नेविगेशन और एक्शन बटन */}
        <nav className="hidden md:flex items-center space-x-4">
          {/* ✅ डेस्कटॉप बटन को यहां से बदलें */}
          {renderSellerButton()}

          <Link href="/wishlist">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          {/* कार्ट बटन */}
          <Button onClick={toggleCart} variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {totalItemsInCart}
              </span>
            )}
            <span className="sr-only">Shopping Cart</span>
          </Button>

          {/* यूज़र ड्रॉपडाउन मेनू */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isLoadingAuth ? (
                <DropdownMenuLabel>Loading...</DropdownMenuLabel>
              ) : isAuthenticated ? (
                <>
                  <DropdownMenuLabel>{user?.name || user?.email || "My Account"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {dashboardLink && (
                    <DropdownMenuItem asChild>
                      <Link href={dashboardLink.path}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {dashboardLink.label}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.role === "customer" && (
                    <DropdownMenuItem asChild>
                      <Link href="/customer/orders">
                        <ListOrdered className="mr-2 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/auth">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login / Sign Up
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* मोबाइल मेनू और सर्च (Sheet) */}
        <div className="flex items-center md:hidden">
          <Button onClick={toggleCart} variant="ghost" size="icon" className="relative mr-2">
            <ShoppingCart className="h-5 w-5" />
            {totalItemsInCart > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {totalItemsInCart}
              </span>
            )}
            <span className="sr-only">Shopping Cart</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-4">
              <div className="flex flex-col items-start space-y-4">
                <form onSubmit={handleSearch} className="w-full flex">
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="flex-grow rounded-r-none focus-visible:ring-offset-0 focus-visible:ring-0"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  <Button type="submit" variant="ghost" className="rounded-l-none">
                    <Search className="h-5 w-5" />
                  </Button>
                </form>

                {/* मोबाइल यूज़र मेनू */}
                {isLoadingAuth ? (
                  <p className="text-gray-700">Loading user...</p>
                ) : isAuthenticated ? (
                  <>
                    <span className="font-semibold text-gray-900">Hello, {user?.name || user?.email?.split('@')[0] || "User"}</span>
                    {dashboardLink && (
                      <Link href={dashboardLink.path} className="w-full">
                        <Button variant="ghost" className="w-full justify-start">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {dashboardLink.label}
                        </Button>
                      </Link>
                    )}
                     {user?.role === "customer" && (
                       <Link href="/customer/orders" className="w-full">
                         <Button variant="ghost" className="w-full justify-start">
                           <ListOrdered className="mr-2 h-4 w-4" />
                           My Orders
                         </Button>
                       </Link>
                     )}
                    <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/auth" className="w-full">
                    <Button variant="ghost" className="w-full justify-start">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login / Sign Up
                    </Button>
                  </Link>
                )}

                <Link href="/wishlist" className="w-full">
                  <Button variant="ghost" className="w-full justify-start">
                    <Heart className="mr-2 h-4 w-4" />
                    Wishlist
                  </Button>
                </Link>
                
                {/* ✅ यहाँ मोबाइल 'Become a Seller' बटन को अपडेट करें */}
                {renderSellerButton()}

                <div className="w-full border-t pt-4">
                  <p className="font-semibold mb-2">Categories</p>
                  {categories.length > 0 ? (
                    <ul className="space-y-2">
                      {categories.map((category) => (
                        <li key={category.id}>
                          <Link href={`/category/${category.slug}`}>
                            <Button variant="ghost" className="w-full justify-start">
                              {category.name}
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No categories available.</p>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {/* ✅ SellerOnboardingDialog को यहाँ रेंडर करें */}
      {isAuthenticated && (
        <SellerOnboardingDialog
          isOpen={isSellerDialogOpen}
          onClose={() => setIsSellerDialogOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
