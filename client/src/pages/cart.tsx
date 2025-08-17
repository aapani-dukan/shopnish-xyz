// cart.tsx
import { useEffect, useState } from "react";
import api from "../lib/api.ts"; // ✅ तुम्हारा axios wrapper import किया
import { auth } from "../lib/firebase.ts";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Cart fetch function
  const fetchCart = async () => {
    try {
      const res = await api.get("/api/cart"); // auth token अपने आप interceptors से जाएगा
      setCartItems(res.data.items || []);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add item
  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      const res = await api.post("/api/cart/add", { productId, quantity });
      setCartItems(res.data.items || []);
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  // ✅ Remove item
  const removeFromCart = async (productId: string) => {
    try {
      const res = await api.post("/api/cart/remove", { productId });
      setCartItems(res.data.items || []);
    } catch (err) {
      console.error("Error removing from cart:", err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  if (loading) return <p>Loading cart...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Cart</h2>
      {cartItems.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        <ul className="space-y-3">
          {cartItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border p-2 rounded"
            >
              <div className="flex items-center space-x-3">
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    ₹{item.price} × {item.quantity}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
