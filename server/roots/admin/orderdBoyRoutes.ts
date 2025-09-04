import { Router, Request, Response } from "express";
import { and, eq, or, isNull } from "drizzle-orm";
import { db } from "../../db.ts";
import { orders, cartItems } from "../../../shared/backend/schema.ts";
import { getIO } from "../../socket.ts";

const router = Router();

/**
 * GET /api/delivery/orders?deliveryBoyId=UID
 */
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const deliveryBoyId = String(req.query.deliveryBoyId || "");

    if (!deliveryBoyId) {
      return res.status(400).json({ message: "deliveryBoyId is required" });
    }

    // Pending orders (not assigned) OR orders assigned to this delivery boy
    const whereClause = or(
      eq(orders.delivery_boy_id, deliveryBoyId),
      and(
        eq(orders.delivery_status, "pending" as any),
        isNull(orders.delivery_boy_id)
      )
    );

    const list = await db.query.orders.findMany({
      where: whereClause,
      with: {
        items: { with: { product: true } },
        seller: true,
        user: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    return res.json({ orders: list });
  } catch (err) {
    console.error("GET /delivery/orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * POST /api/delivery/accept
 */
router.post("/accept", async (req: Request, res: Response) => {
  try {
    const { orderId, deliveryBoyId } = req.body || {};
    if (!orderId || !deliveryBoyId) {
      return res
        .status(400)
        .json({ message: "orderId and deliveryBoyId are required" });
    }

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, delivery_status: true },
    });

    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.delivery_status !== "pending")
      return res.status(409).json({ message: "Order is not pending anymore" });

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updated] = await db
      .update(orders)
      .set({
        delivery_boy_id: deliveryBoyId,
        delivery_status: "accepted" as any,
        delivery_otp: deliveryOtp,
        deliveryAcceptedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    getIO().emit("delivery:orders-changed", {
      reason: "accepted",
      orderId,
      deliveryBoyId,
    });

    return res.json({ message: "Order accepted", order: updated });
  } catch (err) {
    console.error("POST /delivery/accept error:", err);
    return res.status(500).json({ message: "Failed to accept order" });
  }
});

/**
 * POST /api/delivery/update-status
 */
router.post("/update-status", async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body || {};
    if (!orderId || !status) {
      return res
        .status(400)
        .json({ message: "orderId and status are required" });
    }

    const allowed = new Set(["accepted", "picked_up", "out_for_delivery", "delivered"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        delivery_status: status as any,
        ...(status === "picked_up" && { deliveryPickedAt: new Date() }),
        ...(status === "out_for_delivery" && { deliveryOutAt: new Date() }),
        ...(status === "delivered" && { deliveryCompletedAt: new Date() }),
      })
      .where(eq(orders.id, orderId))
      .returning();

    getIO().emit("delivery:orders-changed", {
      reason: "status-updated",
      orderId,
      status,
    });

    return res.json({ message: "Status updated", order: updated });
  } catch (err) {
    console.error("POST /delivery/update-status error:", err);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

/**
 * POST /api/delivery/complete-delivery
 */
router.post("/complete-delivery", async (req: Request, res: Response) => {
  try {
    const { orderId, otp } = req.body || {};
    if (!orderId || !otp) {
      return res.status(400).json({ message: "orderId and otp are required" });
    }

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, userId: true, delivery_otp: true, delivery_status: true },
    });

    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.delivery_status === "delivered")
      return res.status(409).json({ message: "Order already delivered" });
    if (existing.delivery_otp !== otp)
      return res.status(401).json({ message: "Invalid OTP" });

    const [updated] = await db
      .update(orders)
      .set({
        delivery_status: "delivered" as any,
        deliveryCompletedAt: new Date(),
        actualDeliveryTime: new Date(),
        delivery_otp: null,
      })
      .where(eq(orders.id, orderId))
      .returning();

    // ✅ order delivered → clear customer cart
    if (existing.userId) {
      await db.delete(cartItems).where(eq(cartItems.userId, existing.userId));
    }

    getIO().emit("delivery:orders-changed", {
      reason: "delivered",
      orderId,
    });

    return res.json({ message: "Delivery completed", order: updated });
  } catch (err) {
    console.error("POST /delivery/complete-delivery error:", err);
    return res.status(500).json({ message: "Failed to complete delivery" });
  }
});

export default router;
