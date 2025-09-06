// orderController.ts
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { cartItems, deliveryAddresses, orders, orderItems } from "../../shared/backend/schema";
import { eq, desc } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";

/**
 * Handles placing a direct "buy now" order.
 * This is a simplified version of placeOrder for single-item purchases.
 * @param req The authenticated request object containing user details.
 * @param res The response object to send back to the client.
 */
export const placeOrderBuyNow = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place Buy Now order.");
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
    
    // Ensure that the items array is not empty
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    const orderNumber = `ORD-${uuidv4()}`;

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
      
      return orderResult;
    });

    // ✅ Socket.IO event now emitted here, before the final response
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
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ Error placing Buy Now order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

/**
 * Handles placing an order from the user's cart.
 * @param req The authenticated request object containing user details.
 * @param res The response object to send back to the client.
 */
export const placeOrderFromCart = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place order from cart.");
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

    // Ensure that the items array is not empty
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    const orderNumber = `ORD-${uuidv4()}`;

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

      // 4️⃣ Clear cart
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));
      console.log("🛒 [API] Cart cleared as part of order placement.");
      
      return orderResult;
    });

    // ✅ Socket.IO event now emitted here, before the final response
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
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ Error placing cart order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

/**
 * Fetches all orders for the authenticated user.
 * @param req The authenticated request object.
 * @param res The response object.
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🔄 [API] Received request to get user orders.");
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        orderItems: true,
      },
      orderBy: [desc(orders.createdAt)],
    });

    console.log(`✅ [API] Found ${userOrders.length} orders for user ${userId}.`);
    res.status(200).json(userOrders);
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
      
