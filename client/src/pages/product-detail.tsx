import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../lib/api.ts";
import { auth } from "../lib/firebase.ts";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        console.log("🔍 Fetching product details for ID:", id);
        const res = await api.get(`/api/products/${id}`);
        console.log("✅ Product details response:", res.data);
        setProduct(res.data);
      } catch (err) {
        console.error("❌ Error fetching product details:", err);
      }
    };

    fetchProduct();
  }, [id]);

  const addToCart = async () => {
    try {
      console.log("🛒 Adding product to cart:", product?.id);

      const token = await auth.currentUser?.getIdToken();
      console.log("📌 Firebase token:", token);

      if (!token) {
        alert("Please login to add items to cart.");
        return;
      }

      const res = await api.post(
        "/api/cart/add",
        { productId: product?.id, quantity: 1 },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Add to Cart Response:", res.data);
      alert("Product added to cart!");
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
    }
  };

  if (!product) return <p>Loading product...</p>;

  return (
    <div className="p-4">
      <img src={product.image} alt={product.name} className="w-64 h-64 object-cover mb-4" />
      <h2 className="text-2xl font-bold">{product.name}</h2>
      <p className="text-gray-700">{product.description}</p>
      <p className="text-lg font-semibold mt-2">₹{product.price}</p>
      <button
        onClick={addToCart}
        className="bg-blue-600 text-white px-4 py-2 mt-4 rounded"
      >
        Add to Cart
      </button>
    </div>
  );
}
