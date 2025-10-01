// orderController.ts
import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { deliveryAddresses, orders, orderItems } from "../../shared/backend/schema";
import { eq, desc, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";
import { cartItems } from "../shared/backend/schema";
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
    
    // ✅ NEW: Lat/Lng को rawDeliveryAddress से अलग करें
    const safeAddress = rawDeliveryAddress || {};
    const latitude = safeAddress.latitude || 0; // Default to 0 if missing
    const longitude = safeAddress.longitude || 0; // Default to 0 if missing

    const orderNumber = `ORD-${uuidv4()}`;

    const newOrder = await db.transaction(async (tx) => {
      let newDeliveryAddressId: number;

      // 1️⃣ Insert delivery address
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId,
        fullName: safeAddress.fullName || req.user?.name || "Unknown Customer",
        phoneNumber: safeAddress.phone || req.user?.phone || "0000000000",
        addressLine1: safeAddress.address || "N/A",
        addressLine2: safeAddress.landmark || "",
        city: safeAddress.city || "Unknown",
        postalCode: safeAddress.pincode || "000000",
        state: "Rajasthan",
        // ✅ NEW: deliveryAddresses टेबल में कोऑर्डिनेट्स सेव करें
        latitude: latitude, 
        longitude: longitude,
      }).returning();
      newDeliveryAddressId = newAddress.id;

      // 2️⃣ Insert order
      const [orderResult] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber,
        subtotal: parseFloat(subtotal).toFixed(2),
        total: parseFloat(total).toFixed(2),
        deliveryCharge: parseFloat(deliveryCharge).toFixed(2),
        paymentMethod: paymentMethod || "COD",
        deliveryAddressId: newDeliveryAddressId,
        deliveryInstructions,
        deliveryAddress: JSON.stringify(safeAddress),
        deliveryBoyId: null,
        // ✅ NEW: orders टेबल में कोऑर्डिनेट्स सेव करें
        deliveryLat: latitude,
        deliveryLng: longitude,
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
          status: 'placed',
          userId,
        });
      }
      
      return orderResult;
    });

    getIO().emit("new-order", {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerId: newOrder.customerId,
      total: newOrder.total,
      status: newOrder.status,
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

// ----------------------------------------------------

/**
 * Handles placing an order from the user's cart.
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

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    const safeAddress = rawDeliveryAddress || {};
    const latitude = safeAddress.latitude || 0;
    const longitude = safeAddress.longitude || 0;

    const orderNumber = `ORD-${uuidv4()}`;

    const newOrder = await db.transaction(async (tx) => {
      let newDeliveryAddressId: number;

      // 1️⃣ Insert delivery address
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId,
        fullName: safeAddress.fullName || req.user?.name || "Unknown Customer",
        phoneNumber: safeAddress.phone || req.user?.phone || "0000000000",
        addressLine1: safeAddress.address || "N/A",
        addressLine2: safeAddress.landmark || "",
        city: safeAddress.city || "Unknown",
        postalCode: safeAddress.pincode || "000000",
        state: "Rajasthan",
        latitude,
        longitude,
      }).returning();
      newDeliveryAddressId = newAddress.id;

      // 2️⃣ Insert order
      const [orderResult] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber,
        subtotal: parseFloat(subtotal).toFixed(2),
        total: parseFloat(total).toFixed(2),
        deliveryCharge: parseFloat(deliveryCharge).toFixed(2),
        paymentMethod: paymentMethod || "COD",
        deliveryAddressId: newDeliveryAddressId,
        deliveryInstructions,
        deliveryAddress: JSON.stringify(safeAddress),
        deliveryBoyId: null,
        deliveryLat: latitude,
        deliveryLng: longitude,
      }).returning();

      // 3️⃣ Copy cart items into orderItems table (fresh rows)
      for (const item of items) {
        await tx.insert(orderItems).values({
          userId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          orderId: orderResult.id,
          status: "placed",
        });
      }

      console.log("✅ Cart items copied to new order.");

      // 4️⃣ Delete all in_cart items for this user
      await tx.delete(orderItems).where(and(
        eq(orderItems.userId, userId),
        eq(orderItems.status, "in_cart")
      ));

      console.log("🗑️ In-cart items deleted successfully.");

      return orderResult; // ✅ transaction को result लौटाना चाहिए
    });

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error("❌ Error placing order:", error.message || error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};

// ----------------------------------------------------

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
        items: true,
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

// ----------------------------------------------------
// ⭐ NEW: Order Tracking Details Function ⭐
// ----------------------------------------------------

/**
 * Fetches the initial tracking details for a specific order.
 * This is the API endpoint the frontend hits on the TrackOrder page.
 * @param req The authenticated request object.
 * @param res The response object.
 */
export const getOrderTrackingDetails = async (req: AuthenticatedRequest, res: Response) => {
  console.log("📡 [API] Received request to get order tracking details.");
  try {
    const customerId = req.user?.id;
    const orderId = Number(req.params.orderId);

    if (!customerId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID provided." });
    }

    // 1. Fetch the order details, ensuring it belongs to the authenticated user.
    const [order] = await db.select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.customerId, customerId)
      ))
      .limit(1);

    if (!order) {
      return res.status(404).json({ message: "Order not found or access denied." });
    }
    
    // 2. Return the initial static tracking data (live location comes via Socket.IO)
    // deliveryAddress JSON string को Parse करें ताकि हम अन्य fields निकाल सकें
    const deliveryAddress = JSON.parse(order.deliveryAddress as string) || {}; 

    res.status(200).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryAddress: {
        // ✅ NEW: orders टेबल से Lat/Lng का उपयोग करें
        lat: order.deliveryLat || 0, 
        lng: order.deliveryLng || 0,
        address: deliveryAddress.address || '',
        city: deliveryAddress.city || '',
        pincode: deliveryAddress.pincode || '',
      },
      deliveryBoyId: order.deliveryBoyId,
    });

  } catch (error) {
    console.error("❌ Error fetching order tracking details:", error);
    res.status(500).json({ message: "Failed to fetch tracking details." });
  }
};



/**
 * Fetches details for a specific order ID.
 */
export const getOrderDetail = async (req: AuthentivatedRequest, res: Response) => {
    console.log("🔍 [API] Received request to get specific order details.");
    try {
        const customerId = req.user?.id;
        const orderId = Number(req.params.orderId); // Note: req.params.orderId

        if (!customerId) return res.status(401).json({ message: "Unauthorized." });
        if (isNaN(orderId)) return res.status(400).json({ message: "Invalid order ID." });

        const orderDetail = await db.query.orders.findFirst({
            where: and(
                eq(orders.id, orderId),
                eq(orders.customerId, customerId)
            ),
            with: {
                items: true,
                // deliveryAddress: true, // यदि आप चाहें तो
            },
        });

        if (!orderDetail) {
            return res.status(404).json({ message: "Order not found or access denied." });
        }
        
        console.log(`✅ [API] Found order ${orderId}.`);
        res.status(200).json(orderDetail);
    } catch (error) {
        console.error("❌ Error fetching specific order:", error);
        res.status(500).json({ message: "Failed to fetch order details." });
    }
};
        
