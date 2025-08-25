// server/controllers/orderController.ts (Corrected Logic)

import { Request, Response } from 'express';
import { db } from '../db.ts';
import { orders, orderItems, products, users } from '../../shared/backend/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Function to place a new order
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    // ✅ 1. डेटाबेस से सीधे "in_cart" वाले आइटम को फ़ेच करें
    const cartItems = await db.query.orderItems.findMany({
      where: and(
        eq(orderItems.userId, userId),
        eq(orderItems.status, 'in_cart')
      ),
      with: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty, cannot place an order." });
    }

    // ✅ 2. टोटल और सबटोटल की गणना करें
    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    // यहाँ आप डिलीवरी चार्ज, डिस्काउंट आदि जोड़ सकते हैं
    const total = subtotal;

    // ✅ डेटाबेस ट्रांजेक्शन शुरू करें
    await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      // 3. एक नया ऑर्डर डालें
      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending", // ✅ स्टेटस को 'placed' के बजाय 'pending' पर सेट करें
        orderNumber: orderNumber,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: 'COD', // उदाहरण के लिए
        deliveryAddress: req.body.deliveryAddress,
      }).returning();

      // 4. ऑर्डर आइटम का स्टेटस बदलें और उन्हें नए ऑर्डर से जोड़ें
      await tx.update(orderItems)
        .set({
          status: 'pending', // ✅ आइटम का स्टेटस 'pending' करें
          orderId: newOrder.id, // ✅ आइटम को नए ऑर्डर से जोड़ें
          updatedAt: new Date(),
        })
        .where(and(
          eq(orderItems.userId, userId),
          eq(orderItems.status, 'in_cart')
        ));
    });

    res.status(201).json({ message: "Order placed successfully!" });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};



/**
 * Function to get a user's orders
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const ordersWithItems = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        items: {
          with: {
            product: { with: { seller: true } },
          },
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
