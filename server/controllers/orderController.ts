// server/controllers/orderController.ts

import { Request, Response } from 'express';
import { db } from '../db.ts';
import { orders, orderItems, cartItems } from '../../shared/backend/schema.ts'; // ✅ Drizzle स्कीमा इंपोर्ट करें
import { eq } from 'drizzle-orm'; // ✅ Drizzle ORM से आवश्यक हेल्पर फ़ंक्शन इंपोर्ट करें

// Function to create a new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; 
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { order, items } = req.body;

    // ✅ Drizzle का उपयोग करके एक नया ऑर्डर डालें
    const newOrder = await db.insert(orders).values({
      ...order,
      customerId: userId,
      status: "placed",
      deliveryAddress: JSON.stringify(order.deliveryAddress),createdAt: new Date(),
    }).returning({ id: orders.id }); // ID वापस पाएं

    const orderId = newOrder[0].id; // डालें गए ऑर्डर की ID

    // ✅ Drizzle का उपयोग करके ऑर्डर आइटम डालें
    const orderItemsData = items.map((item: any) => ({
      ...item,
      orderId: orderId,
      productId: item.productId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    await db.insert(orderItems).values(orderItemsData);

    // ✅ Drizzle का उपयोग करके कार्ट को साफ़ करें
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    res.status(201).json({
      message: "Order placed successfully!",
      orderId: orderId,
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

// Function to get a user's orders (for future use)
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Drizzle का उपयोग करके ऑर्डर प्राप्त करें
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
