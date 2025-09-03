import { Router, Request, Response } from "express";
import { db } from "../../db";
import { orders } from "../../../shared/backend/schema";
import { eq, and, or } from "drizzle-orm";

const router = Router();

/**
 * 🚚 1. Get Orders for Delivery Boys
 * - अगर deliveryBoyId दिया है → केवल उसी delivery boy के orders दिखाओ
 * - अगर deliveryBoyId नहीं है → सभी pending orders दिखाओ (unassigned orders)
 */
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const { deliveryBoyId } = req.query;

    let result;
    if (deliveryBoyId) {
      // उस delivery boy को assigned orders
      result = await db
        .select()
        .from(orders)
        .where(eq(orders.delivery_boy_id, String(deliveryBoyId)));
    } else {
      // Pending orders (अभी तक assign नहीं हुए)
      result = await db
        .select()
        .from(orders)
        .where(eq(orders.delivery_status, "pending"));
    }

    res.json({ orders: result });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * 🚚 2. Accept an Order (Delivery boy assigns himself)
 * - delivery_status = accepted
 * - delivery_boy_id set करना
 */
router.post("/accept", async (req: Request, res: Response) => {
  try {
    const { orderId, deliveryBoyId } = req.body;

    if (!orderId || !deliveryBoyId) {
      return res
        .status(400)
        .json({ message: "OrderId and DeliveryBoyId required" });
    }

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updated] = await db
      .update(orders)
      .set({
        delivery_boy_id: deliveryBoyId,
        delivery_status: "accepted",
        delivery_otp: deliveryOtp,
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.json({ message: "Order accepted", order: updated });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ message: "Failed to accept order" });
  }
});

/**
 * 🚚 3. Update Delivery Status
 * - e.g. accepted → picked_up → delivered
 */
router.post("/update-status", async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ message: "OrderId and Status required" });
    }

    const [updated] = await db
      .update(orders)
      .set({ delivery_status: status })
      .where(eq(orders.id, orderId))
      .returning();

    res.json({ message: "Delivery status updated", order: updated });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/**
 * 🚚 4. Complete Delivery with OTP
 */
router.post("/complete-delivery", async (req: Request, res: Response) => {
  try {
    const { orderId, otp } = req.body;

    if (!orderId || !otp) {
      return res.status(400).json({ message: "OrderId and OTP required" });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.delivery_otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        delivery_status: "delivered",
        actual_delivery_time: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.json({ message: "Order delivered successfully", order: updated });
  } catch (error) {
    console.error("Error completing delivery:", error);
    res.status(500).json({ message: "Failed to complete delivery" });
  }
});

export default router;
