// client/src/pages/ProductDetail.tsx

import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // useQuery को हटाया
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function ProductDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ कंसोल लॉग को सरल किया
  console.log("Product ID for Add to Cart:", id);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      console.log("🚀 [Add to Cart] Attempting to add product ID:", id);
      // API कॉल सीधे productId के साथ
      return await apiRequest("POST", "/api/cart/add", { 
        productId: Number(id), // सुनिश्चित करें कि यह एक संख्या है
        quantity: 1 
      });
    },
    onSuccess: () => {
      toast({ title: "Added to cart", description: "Item successfully added." });
      // कार्ट को अपडेट करने के लिए queries को इनवैलिडेट करें
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (err) => {
      console.error("❌ [Add to Cart] Mutation failed:", err);
      toast({ title: "Failed to add", description: "An error occurred.", variant: "destructive" });
    },
  });

  const handleAddToCart = () => {
    console.log("✅ [Add to Cart] Button clicked. Initiating mutation.");
    addToCartMutation.mutate();
  };

  // ✅ सरल UI जो सिर्फ़ बटन दिखाता है
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
      {/* आप चाहें तो यहाँ प्रोडक्ट की जानकारी हार्डकोड कर सकते हैं */}
      <div className="mt-4">
        {/*
          आप चाहें तो यहाँ एक अस्थायी प्रोडक्ट नाम दिखा सकते हैं
          जब तक कि आप useQuery को वापस नहीं जोड़ते।
        */}
        <p className="text-gray-500">
          (Product data is not being fetched in this simplified example.)
        </p>
      </div>
    </div>
  );
}
