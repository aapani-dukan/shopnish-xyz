import { cartItems } from '../../shared/backend/schema.ts'; // ✅ cartItems import करें
import { eq } from 'drizzle-orm'; // ✅ eq import करें

export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place order.");
  console.log("📋 [API] Request Body:", req.body);

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("⚠️ [API] Unauthorized: User ID missing.");
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { deliveryAddress, paymentMethod, deliveryInstructions, items, subtotal, total, deliveryCharge } = req.body;

    if (!items || items.length === 0) {
      console.log("🛒 [API] Items list is empty, cannot place an order.");
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    const orderNumber = `ORD-${uuidv4()}`;
    const parsedSubtotal = parseFloat(subtotal);
    const parsedTotal = parseFloat(total);
    const parsedDeliveryCharge = parseFloat(deliveryCharge);
    const orderPaymentMethod = paymentMethod || 'COD';
    const deliveryBoyId = null;

    let newOrder: any;
    let newDeliveryAddressId;

    await db.transaction(async (tx) => {
      // STEP 1: deliveryAddresses टेबल में नया पता डालें
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId: userId,
        fullName: deliveryAddress.fullName,
        phoneNumber: deliveryAddress.phone,
        addressLine1: deliveryAddress.address,
        addressLine2: deliveryAddress.landmark,
        city: deliveryAddress.city,
        postalCode: deliveryAddress.pincode,
        state: "Rajasthan",
      }).returning();
      
      newDeliveryAddressId = newAddress.id;

      // STEP 2: orders टेबल में नया ऑर्डर डालें
      [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        deliveryStatus: "pending",
        orderNumber,
        subtotal: parsedSubtotal.toFixed(2),
        total: parsedTotal.toFixed(2),
        deliveryCharge: parsedDeliveryCharge.toFixed(2),
        paymentMethod: orderPaymentMethod,
        deliveryAddressId: newDeliveryAddressId,
        deliveryInstructions,
        deliveryAddress: JSON.stringify(deliveryAddress),
        deliveryBoyId,
      }).returning();

      // STEP 3: orderItems रिकॉर्ड डालें
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId,
          sellerId: item.sellerId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      // ✅ STEP 4: Cart खाली करना (user के सभी items delete)
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));
    });

    // STEP 5: Socket.IO इवेंट भेजें
    getIO().emit("new-order", {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerId: newOrder.customerId,
      total: newOrder.total,
      status: newOrder.status,
      deliveryStatus: newOrder.deliveryStatus,
      createdAt: newOrder.createdAt,
      items,
    });

    res.status(201).json({ message: "Order placed successfully!", orderId: newOrder.id });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};
