// server/controllers/orderController.ts

import { Request, Response } from 'express';
import { db } from '../db.ts';
import { orders, orderItems, cartItems } from '../../shared/backend/schema.ts';
import { eq, desc } from 'drizzle-orm';

// ✅ Helper: Parse date safely
function toDate(value: any): Date {
  return value instanceof Date ? value : new Date(value);
}

// Function to create a new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { order, items } = req.body;

    if (!order || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid order payload." });
    }

    // ✅ Insert order
    const newOrder = await db.insert(orders).values({
      customerId: userId,
      status: "placed",
      deliveryAddress: JSON.stringify(order.deliveryAddress || {}),
      // ✅ Ensure proper Date objects
      createdAt: toDate(order.createdAt || new Date()),
      updatedAt: toDate(order.updatedAt || new Date()),
    }).returning({ id: orders.id });

    const orderId = newOrder[0].id;

    // ✅ Insert order items
    const orderItemsData = items.map((item: any) => ({
      orderId,
      productId: item.productId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    if (orderItemsData.length > 0) {
      await db.insert(orderItems).values(orderItemsData);
    }

    // ✅ Clear user's cart
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    res.status(201).json({
      message: "Order placed successfully!",
      orderId,
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

// Function to get a user's orders
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ordersWithItems = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
