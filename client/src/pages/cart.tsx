import { useEffect, useState } from "react";
import api from "../lib/api.ts"; // <- तुम्हारा axios wrapper
import { auth } from "../lib/firebase.ts";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    name: string;
    price: number;
    image?: string;
  };
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        console.log("🛒 Fetching cart...");

        const token = await auth.currentUser?.getIdToken();
        console.log("📌 Firebase token:", token);

        if (!token) {
          console.warn("⚠️ No user token found. User might not be logged in.");
          setLoading(false);
          return;
        }

        const res = await api.get("/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("✅ Cart API Response:", res.data);
        setCartItems(res.data);
      } catch (err) {
        console.error("❌ Error fetching cart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  if (loading) return <p>Loading cart...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Cart</h2>
      {cartItems.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        <ul>
          {cartItems.map((item) => (
            <li key={item.id} className="mb-2 border-b pb-2">
              <img src={item.product.image} alt={item.product.name} className="w-16 h-16 object-cover" />
              <p>{item.product.name}</p>
              <p>Quantity: {item.quantity}</p>
              <p>Price: ₹{item.product.price}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
