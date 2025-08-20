// client/src/components/product-card.tsx

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient"; // ध्यान दें, यह आपकी API request utility है
import React, { useState } from "react";
import { useAuth } from "@/providers/auth-provider"; // ✅ नया: AuthProvider से useAuth हुक आयात करें
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom"; // ✅ नया: useNavigate हुक आयात करें

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // ✅ नया: उपयोगकर्ता को AuthProvider से प्राप्त करें
  const navigate = useNavigate(); // ✅ नया: नेविगेशन के लिए हुक
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false); // ✅ नया: पॉपअप स्थिति

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      // ✅ apiRequest का उपयोग करके सही POST call
      return await apiRequest("POST", "/api/cart/add", { productId, quantity });
    },
    onSuccess: (data) => {
      console.log("✅ Cart API Response (onSuccess):", data);
      
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      
      toast({
        title: "Added to cart",
        description: `${product?.name} has been added to your cart.`,
      });
    },
    onError: (error: any) => { // ✅ त्रुटि का प्रकार निर्दिष्ट करें
      console.error("❌ Error adding to cart:", error);
      const errorMessage = error.message || "An error occurred while adding the item to your cart.";
      
      toast({
        title: "Failed to add to cart",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    // ✅ यदि उपयोगकर्ता लॉग इन नहीं है, तो पॉपअप दिखाएं
    if (!user) {
      setIsLoginPopupOpen(true);
      return;
    }

    if (product.stock === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
      });
      return;
    }

    addToCartMutation.mutate({
      productId: product.id,
      quantity: 1,
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <img src={product.image} alt={product.name} className="h-40 w-full object-cover rounded-lg mb-4" />
      <h3 className="text-lg font-semibold truncate">{product.name}</h3>
      <p className="text-gray-600 mb-2">₹{product.price}</p>
      <Button 
        onClick={handleAddToCart} 
        disabled={addToCartMutation.isPending || product.stock === 0}
        className="w-full"
      >
        {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
      </Button>

      {/* ✅ नया: लॉगिन पॉपअप */}
      <Dialog open={isLoginPopupOpen} onOpenChange={setIsLoginPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Please log in to add items to your cart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsLoginPopupOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setIsLoginPopupOpen(false);
              navigate("/login");
            }}>Login</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCard;
