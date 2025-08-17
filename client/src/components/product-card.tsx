import React, { useState } from "react";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast"; // अपने toast hook का सही import path डालो
import { Button } from "@/components/ui/button";   // मान लो तुम Shadcn button use कर रहे हो

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  addItem: (item: {
    productId: number;
    name: string;
    price: string;
    image: string;
    quantity: number;
  }) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, addItem }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stock === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      console.log("🛒 Sending API request to add to cart...", product);

      // ✅ Backend API call
      const response = await api.post("/api/cart/add", {
        productId: product.id,
        quantity: 1,
      });

      console.log("✅ Cart API Response:", response.data);

      // ✅ Local store update
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error: any) {
      console.error("❌ Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsAdding(false), 1000);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3>{product.name}</h3>
      <p>₹{product.price}</p>
      <Button onClick={handleAddToCart} disabled={isAdding}>
        {isAdding ? "Adding..." : "Add to Cart"}
      </Button>
    </div>
  );
};

export default ProductCard;
