// Server/roots/admin/orderDboyRoutes.ts

import { Router, Request, Response } from 'express';
import { db } from '../../db.ts';
import { orders, orderStatusEnum } from '../../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

// ✅ Assign an Order to a Delivery Boy
// URL: /api/admin/orders/assign
router.patch('/assign', async (req: Request, res: Response) => {
  try {
    const { orderId, deliveryBoyId } = req.body;

    if (!orderId || !deliveryBoyId) {
      return res.status(400).json({ message: "Order ID and Delivery Boy ID are required." });
    }

    // एक 4-अंकीय OTP उत्पन्न करें
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updatedOrder] = await db.update(orders)
      .set({
        deliveryBoyId,
        status: 'assigned_to_delivery_boy',
        deliveryOtp,
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json({
      message: "Order assigned successfully.",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Failed to assign order:", error);
    res.status(500).json({ message: "Failed to assign order." });
  }
});

export default router;
