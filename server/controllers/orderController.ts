// server/controllers/orderController.ts

import { Request, Response } from "express";
import { db } from "../db.ts";
import { orders, orderItems, cartItems, carts, products } from "../../shared/backend/schema.ts";
import { eq, desc } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";
import { v4 as uuidv4 } from "uuid";

/**
 * Function to place a new order
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { deliveryAddress, paymentMethod, items, subtotal, total, deliveryCharge } = req.body;

    if (!items || items.length === 0 || subtotal === undefined || total === undefined) {
      return res.status(400).json({ message: "Missing required order details." });
    }

    // ✅ डेटाबेस ट्रांजेक्शन शुरू करें
    const order = await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      // 1. नया ऑर्डर डालें
      const [newOrder] = await tx
        .insert(orders)
        .values({
          user_id: userId,
          status: "placed",
          order_number: orderNumber,
          subtotal: total - (deliveryCharge || 0),
          total: total,
          delivery_charge: deliveryCharge || 0,
          delivery_address: JSON.stringify(deliveryAddress),
          payment_method: paymentMethod,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // 2. ऑर्डर आइटम डालें
      const orderItemsData = items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        seller_id: item.sellerId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      await tx.insert(orderItems).values(orderItemsData);

      // 3. कार्ट को साफ़ करें (पहले user का cart ढूँढो फिर उसके items हटाओ)
      const userCart = await tx.query.carts.findFirst({
        where: eq(carts.user_id, userId),
      });

      if (userCart) {
        await tx.delete(cartItems).where(eq(cartItems.cart_id, userCart.id));
      }

      return newOrder;
    });

    res.status(201).json({
      message: "Order placed successfully!",
      orderId: order.id,
    });
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
      where: eq(orders.user_id, userId),
      with: {
        items: {
          with: {
            product: { with: { seller: true } },
          },
        },
      },
      orderBy: [desc(orders.created_at)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
