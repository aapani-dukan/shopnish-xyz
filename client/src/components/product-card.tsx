import api from "@/lib/api"; // 👈 ये import ज़रूर करो

const handleAddToCart = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (product.stock === 0) {
    toast({
      title: "Out of Stock",
      description: "This product is currently unavailable.",
      variant: "destructive",
    });
    return;
  }

  setIsAdding(true);

  try {
    console.log("🛒 Sending API request to add to cart...", product);

    // ✅ Backend API call
    const response = await api.post("/api/cart/add", {
      productId: product.id,
      quantity: 1,
    });

    console.log("✅ Cart API Response:", response.data);

    // ✅ Local store update
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  } catch (error: any) {
    console.error("❌ Error adding to cart:", error);
    toast({
      title: "Error",
      description: "Failed to add item to cart.",
      variant: "destructive",
    });
  } finally {
    setTimeout(() => setIsAdding(false), 1000);
  }
};
