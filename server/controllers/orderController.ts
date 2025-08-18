// server/controllers/orderController.ts

import { Request, Response } from 'express';
import { db } from '../db.ts'; // आपके डेटाबेस कनेक्शन का पथ

// Function to create a new order
export const createOrder = async (req: Request, res: Response) => {
  try {
    // We assume req.user is populated by a Firebase auth middleware
    const userId = req.user?.id; 
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { order, items } = req.body;

    const newOrder = await db.order.create({
      data: {
        ...order,
        customerId: userId,
        status: "placed",
        deliveryAddress: JSON.stringify(order.deliveryAddress),
      },
    });

    const orderItems = items.map((item: any) => ({
      ...item,
      orderId: newOrder.id,
      productId: item.productId,
      sellerId: item.sellerId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    await db.orderItem.createMany({
      data: orderItems,
    });

    // Clear the cart after a successful order
    await db.cartItem.deleteMany({
      where: {
        userId: userId,
      },
    });

    res.status(201).json({
      message: "Order placed successfully!",
      orderId: newOrder.id,
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

    const orders = await db.order.findMany({
      where: { customerId: userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
