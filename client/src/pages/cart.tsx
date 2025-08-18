// client/src/pages/Cart.tsx

import { useQuery } from "@tanstack/react-query";
import { auth } from "../lib/firebase.ts";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";

// Interfaces आपके original code के अनुसार हैं
interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    name: string;
    price: string;
    image?: string;
  };
}

export default function Cart() {
  const { data: cartItems, isLoading, error } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"], // ✅ यही key ProductDetail.tsx में invalidate हो रही है
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        console.warn("❌ No token found, returning empty cart");
        return [];
      }

      const response = await apiRequest("GET", "/api/cart");
      console.log("🛒 Cart API Raw Response:", response);

      // ✅ हमेशा array लौटाओ ताकि .map पर error न आए
      return Array.isArray(response.items) ? response.items : [];
    },
    enabled: !!auth.currentUser, // ✅ जब तक user लॉग इन नहीं होता, query disable
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="p-4 text-center">Loading cart...</p>
        <Footer />
      </div>
    );
  }

  if (error) {
    console.error("❌ Cart fetch error:", error);
    return (
      <div className="min-h-screen">
        <Header />
        <p className="p-4 text-center text-red-500">
          Error: Failed to load cart.
        </p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Your Cart</h2>

        {!cartItems || cartItems.length === 0 ? (
          <p className="text-center text-gray-500">No items in cart.</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-4 p-4 border rounded-lg shadow-sm"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-md"
                />
                <div className="flex-1">
                  <p className="font-semibold text-lg">{item.product.name}</p>
                  <p className="text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-primary font-bold">
                    ₹{item.product.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
