// client/src/pages/ProductDetail.tsx

import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { getAuth } from "firebase/auth";

export default function ProductDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log("Product ID for Add to Cart:", id);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Invalid product ID");

      console.log("🚀 [Add to Cart] Attempting to add product ID:", id);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated.");
      }
      const token = await user.getIdToken();

      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: id, quantity: 1 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to add to cart");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to Cart",
        description: `Product has been added successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to cart",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    addToCartMutation.mutate();
  };

  // ✅ Simple UI
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Product Detail Page</h1>
      <p>Product ID: {id}</p>
      <Button
        onClick={handleAddToCart}
        disabled={addToCartMutation.isPending || !id}
      >
        {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
      </Button>

      <div className="mt-4">
        <p className="text-gray-500">
          (Product data is not being fetched in this simplified example.)
        </p>
      </div>
    </div>
  );
}
