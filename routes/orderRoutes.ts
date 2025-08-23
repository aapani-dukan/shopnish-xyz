// server/routes/orderRoutes.ts

import { Router, Response } from "express";
import { AuthenticatedRequest } from "../server/middleware/authMiddleware";
import { db } from '../server/db';
import { orders, orderItems } from '../shared/backend/schema';
import { v4 as uuidv4 } from "uuid";
// ✅ सुनिश्चित करें कि ये इंपोर्ट सही हैं
import { requireAuth } from "../server/middleware/authMiddleware";
import { getUserOrders } from "../server/controllers/orderController";

const ordersRouter = Router();

// ✅ placeOrder फ़ंक्शन का कोड यहाँ पर है
ordersRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, items, subtotal, deliveryCharge, discount, total, paymentMethod, deliveryAddress } = req.body;

    if (!customerId || !items || items.length === 0 || !subtotal || !total || !paymentMethod || !deliveryAddress) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    // ✅ unique order number generate करें
    const orderNumber = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    const [order] = await db
      .insert(orders)
      .values({
        customerId,
        orderNumber,
        subtotal,
        deliveryCharge: deliveryCharge || 0,
        discount: discount || 0,
        total,
        paymentMethod,
        deliveryAddress,
        paymentStatus: "pending",
        status: "pending",
      })
      .returning();

    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }

    return res.status(201).json({ message: "Order placed successfully!", orderId: order.id });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return res.status(500).json({ error: "Failed to place order." });
  }
});


// ✅ getUserOrders रूट भी यहाँ है
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
