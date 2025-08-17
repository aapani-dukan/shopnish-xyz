// src/pages/product-detail.tsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);

  // ✅ Product fetch
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await axios.get(`/api/products/${id}`);
      return res.data;
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  // ✅ Add to Cart Function
  const handleAddToCart = async () => {
    try {
      const res = await axios.post("/api/cart/add", {
        productId: product.id,
        quantity,
      });
      alert("✅ Product added to cart!");
      console.log("Cart Response:", res.data);
    } catch (error) {
      console.error("❌ Error adding to cart:", error);
      alert("Failed to add to cart.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <p className="text-gray-700">{product.description}</p>
      <p className="text-lg font-semibold">₹{product.price}</p>

      <div className="flex items-center gap-2 my-4">
        <label>Qty:</label>
        <input
          type="number"
          value={quantity}
          min={1}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="border p-1 w-16"
        />
      </div>

      <Button onClick={handleAddToCart}>Add to Cart</Button>
    </div>
  );
};

export default ProductDetail;
