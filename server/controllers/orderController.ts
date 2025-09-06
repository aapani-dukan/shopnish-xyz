import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { cartItems, deliveryAddresses, orders, orderItems } from "../../shared/backend/schema";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";

/**
 * Handles placing an order, either from the user's cart or a direct "buy now" action.
 * @param req The authenticated request object containing user details.
 * @param res The response object to send back to the client.
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place order.");
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const {
      deliveryAddress: rawDeliveryAddress,
      paymentMethod,
      deliveryInstructions,
      items,
      subtotal,
      total,
      deliveryCharge,
    } = req.body;

    // ✅ Handle empty items list
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    // Determine if it's a cart order based on the items received
    // If the items list comes from the cart, we need to clear it later.
    const isCartOrder = items.some((item: any) => item.fromCart);
    console.log(`🛒 [API] Is this a cart order? ${isCartOrder}`);

    // Generate a unique order number
    const orderNumber = `ORD-${uuidv4()}`;

    // Use a transaction to ensure all database operations succeed or fail together
    const newOrder = await db.transaction(async (tx) => {
      let newDeliveryAddressId: number;

      // 1️⃣ Insert delivery address
      const safeAddress = rawDeliveryAddress || {};
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId,
        fullName: safeAddress.fullName || req.user?.name || "Unknown Customer",
        phoneNumber: safeAddress.phone || req.user?.phone || "0000000000",
        addressLine1: safeAddress.address || "N/A",
        addressLine2: safeAddress.landmark || "",
        city: safeAddress.city || "Unknown",
        postalCode: safeAddress.pincode || "000000",
        state: "Rajasthan",
      }).returning();
      newDeliveryAddressId = newAddress.id;

      // 2️⃣ Insert order
      const [orderResult] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        deliveryStatus: "pending",
        orderNumber,
        subtotal: parseFloat(subtotal).toFixed(2),
        total: parseFloat(total).toFixed(2),
        deliveryCharge: parseFloat(deliveryCharge).toFixed(2),
        paymentMethod: paymentMethod || "COD",
        deliveryAddressId: newDeliveryAddressId,
        deliveryInstructions,
        deliveryAddress: JSON.stringify(safeAddress),
        deliveryBoyId: null,
      }).returning();

      // 3️⃣ Insert order items
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: orderResult.id,
          productId: item.productId,
          sellerId: item.sellerId,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice),
        });
      }

      // 4️⃣ Clear cart only if it's a cart order
      if (isCartOrder) {
        await tx.delete(cartItems).where(eq(cartItems.userId, userId));
        console.log("🛒 [API] Cart cleared as part of order placement.");
      }
      
      return orderResult;
    });

    // 5️⃣ Emit socket event for new order
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

    res.status(201).json({ 
        message: "Order placed successfully!", 
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        data: newOrder 
    });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};
