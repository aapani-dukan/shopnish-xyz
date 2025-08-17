// components/Cart.tsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/axios";

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    image?: string;
  };
}

const Cart: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Cart fetch करने वाला function
  const fetchCart = async () => {
    try {
      const res = await api.get("/api/cart");
      setCartItems(res.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ quantity update function
  const updateQuantity = async (itemId: number, newQuantity: number) => {
    try {
      await api.put(`/api/cart/update/${itemId}`, { quantity: newQuantity });
      fetchCart(); // अपडेट के बाद cart फिर से लोड करें
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  // ✅ item remove function
  const removeItem = async (itemId: number) => {
    try {
      await api.delete(`/api/cart/remove/${itemId}`);
      fetchCart();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  // ✅ Mount पर cart लोड करना
  useEffect(() => {
    fetchCart();
  }, []);

  if (loading) return <p>Loading cart...</p>;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Your Cart</h2>

      {cartItems.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <ul className="space-y-4">
          {cartItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <div className="flex items-center space-x-4">
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">
                    ₹{item.product.price} x {item.quantity}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    updateQuantity(item.id, Math.max(item.quantity - 1, 1))
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-2 px-3 py-1 bg-red-500 text-white rounded"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Cart;
