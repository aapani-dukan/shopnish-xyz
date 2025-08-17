// pages/product-detail.tsx
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState(1);

  // ✅ Product details fetch
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await axios.get(`/api/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // ✅ Add to Cart Mutation
  const addToCart = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token"); // auth token
      const res = await axios.post(
        "/api/cart",
        {
          productId: product?.id,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      alert("✅ Product added to cart!");
    },
    onError: () => {
      alert("❌ Failed to add product to cart. Please login.");
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (error || !product) return <p>Product not found</p>;

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Image */}
      <Card className="flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-96 object-cover rounded-2xl"
        />
      </Card>

      {/* Details */}
      <div>
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
        <p className="text-lg text-gray-600 mb-4">{product.description}</p>
        <p className="text-2xl font-semibold mb-6">₹{product.price}</p>

        {/* Quantity Selector */}
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            -
          </Button>
          <span className="px-4">{quantity}</span>
          <Button variant="outline" onClick={() => setQuantity((q) => q + 1)}>
            +
          </Button>
        </div>

        {/* Add to Cart */}
        <Button
          className="w-full"
          onClick={() => addToCart.mutate()}
          disabled={addToCart.isPending}
        >
          {addToCart.isPending ? "Adding..." : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
