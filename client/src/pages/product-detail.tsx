// client/src/pages/ProductDetail.tsx

import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function ProductDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ यह सुनिश्चित करने के लिए कि id सही ढंग से मिल रहा है
  console.log("Product ID from URL:", id);

  const { data: product, isLoading: productLoading, error } = useQuery({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      return response.json();
    },
    enabled: !!id,
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      console.log("Mutating... Product ID:", product?.id);
      return await apiRequest("POST", "/api/cart/add", { 
        productId: product?.id, 
        quantity: 1 
      });
    },
    onSuccess: () => {
      toast({ title: "Added to cart", description: "Item successfully added." });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (err) => {
      console.error("Mutation failed:", err);
      toast({ title: "Failed to add", description: "An error occurred.", variant: "destructive" });
    },
  });

  const handleAddToCart = () => {
    console.log("Button clicked!");
    if (!product) {
      console.error("Cannot add to cart: Product data is missing.");
      return;
    }
    addToCartMutation.mutate();
  };

  if (isLoading || productLoading) {
    return <div>Loading product...</div>;
  }

  if (error || !product) {
    return <div>Product not found or an error occurred.</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <img src={product.image} alt={product.name} style={{ width: "300px" }} />
      <Button 
        onClick={handleAddToCart} 
        disabled={addToCartMutation.isPending}
      >
        {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
      </Button>
    </div>
  );
}
