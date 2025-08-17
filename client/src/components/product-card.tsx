// client/src/components/product-card.tsx

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import React from "react";

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

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      // ✅ apiRequest का उपयोग करके सही POST call
      return await apiRequest("POST", "/api/cart/add", { productId, quantity });
    },
    onSuccess: (data) => {
      console.log("✅ Cart API Response (onSuccess):", data);
      
      // ✅ Cart query को invalidate करें ताकि cart page पर data refresh हो
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });

      // ✅ Success toast message दिखाएँ
      toast({
        title: "Added to cart",
        description: `${product?.name} has been added to your cart.`,
      });
    },
    onError: (error) => {
      console.error("❌ Error adding to cart:", error);
      toast({
        title: "Failed to add to cart",
        description: "An error occurred while adding the item to your cart.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
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
    </div>
  );
};

export default ProductCard;
