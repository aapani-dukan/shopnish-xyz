// server/controllers/orderController.ts

import { Request, Response } from 'express';
import { db } from '../db.ts';
import { orders, orderItems, cartItems } from '../../shared/backend/schema.ts'; 
import { eq } from 'drizzle-orm';

// Function to place a new order

// Function to place a new order
export const placeOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { order, items } = req.body;

    // एक अद्वितीय ऑर्डर नंबर जेनरेट करें
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // सभी आइटम के totalPrice को Number में बदलकर subtotal की गणना करें
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0);

    // कुल राशि की गणना करें (subtotal + shipping)
    const total = subtotal + (order.shippingFee || 0);

    // Drizzle का उपयोग करके एक नया ऑर्डर डालें
    const newOrder = await db.insert(orders).values({
      customerId: userId,
      status: "placed",
      orderNumber: orderNumber,
      subtotal: subtotal,
      total: total, // ✅ total फ़ील्ड जोड़ें
      deliveryAddress: JSON.stringify(order.deliveryAddress ?? {}),
      paymentMethod: order.paymentMethod ?? "COD",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: orders.id });

    const orderId = newOrder[0].id;

    // Drizzle का उपयोग करके ऑर्डर आइटम डालें
    const orderItemsData = items.map((item: any) => ({
      orderId: orderId,
      productId: item.productId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(orderItems).values(orderItemsData);

    // कार्ट को साफ़ करें
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    res.status(201).json({
      message: "Order placed successfully!",
      orderId: orderId,
    });

  } catch (error) {
    console.error("Error placing order:", error);
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

    // Drizzle का उपयोग करके ऑर्डर प्राप्त करें
    const ordersWithItems = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
