// server/controllers/orderController.ts
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { cartItems, deliveryAddresses, orders, orderItems } from "../../shared/backend/schema";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";

interface PlaceOrderOptions {
  cartOrder?: boolean; // true = cart order, false = buy-now
}

// ✅ Place order (cart or buy now)
export const placeOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  options: PlaceOrderOptions = { cartOrder: true }
) => {
  console.log("🚀 [API] Received request to place order.");
  console.log("📋 [API] Request Body:", req.body);

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized: User not logged in." });

    const { deliveryAddress, paymentMethod, deliveryInstructions, items, subtotal, total, deliveryCharge } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });

    const orderNumber = `ORD-${uuidv4()}`;
    const parsedSubtotal = parseFloat(subtotal);
    const parsedTotal = parseFloat(total);
    const parsedDeliveryCharge = parseFloat(deliveryCharge);
    const orderPaymentMethod = paymentMethod || "COD";
    const deliveryBoyId = null;

    let newOrder: any;
    let newDeliveryAddressId: number;

    await db.transaction(async (tx) => {
      // 1️⃣ Insert delivery address
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId,
        fullName: deliveryAddress.fullName,
        phoneNumber: deliveryAddress.phone,
        addressLine1: deliveryAddress.address,
        addressLine2: deliveryAddress.landmark,
        city: deliveryAddress.city,
        postalCode: deliveryAddress.pincode,
        state: "Rajasthan",
      }).returning();

      newDeliveryAddressId = newAddress.id;

      // 2️⃣ Insert order
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

      // 3️⃣ Insert order items
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

      // 4️⃣ Clear cart only for cart orders
      if (options.cartOrder) {
        await tx.delete(cartItems).where(eq(cartItems.userId, userId));
      }
    });

    // 5️⃣ Emit socket event
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

    return newOrder; // return newOrder for router to use
  } catch (error) {
    console.error("❌ Error placing order:", error);
    throw error; // throw error so router can catch it
  }
};

// ✅ Get orders for logged-in user
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userOrders = await db.select().from(orders).where(eq(orders.customerId, userId));
    res.status(200).json({ orders: userOrders });
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
