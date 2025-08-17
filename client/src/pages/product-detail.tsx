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
  mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      console.log("🚀 [Add to Cart] Attempting to add product ID:", id);
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated.");
    }
    const token = await user.getIdToken();

    const formData = new FormData();
    formData.append('image', data.image); 
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to add cart");
    }
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined && key !== 'image') {
         formData.append(key, data[key]);
      }
    }
    const response = await fetch("/api/cart/add", {
      method: "POST",
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
    
  },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: editingProduct ? "Product updated" : "Product created",
        description: `Product has been ${editingProduct ? "updated" : "added"} successfully`,
      });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingProduct ? "update" : "added"} product`,
        variant: "destructive",
      });
    },
  });
      // API कॉल सीधे productId के साथ
      

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
