import { Router, Request, Response } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db.ts";
import {
  orders,
  // orderStatusEnum,   // अगर जरूरी हो तभी यूज़ करो
  // deliveryStatusEnum, // schema में हो तो रखो, वरना हटा दो
} from "../../../shared/backend/schema.ts";
import { io } from "../../socket.ts"; // ✅ server/socket.ts में बना हुआ io instance

const router = Router();

/**
 * GET /api/delivery/orders?deliveryBoyId=UID
 * - pending orders: सभी delivery boys को दिखें
 * - accepted orders: सिर्फ वही delivery boy देखे जिसका id match करे
 * Response shape: { orders: [...] }  <-- फ्रंटएंड यही expect कर रहा है
 */
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const deliveryBoyId = String(req.query.deliveryBoyId || "");

    if (!deliveryBoyId) {
      return res.status(400).json({ message: "deliveryBoyId is required" });
    }

    const list = await db.query.orders.findMany({
      where: or(
        eq(orders.deliveryStatus, "pending" as any),
        and(
          eq(orders.deliveryStatus, "accepted" as any),
          eq(orders.deliveryBoyId, deliveryBoyId)
        )
      ),
      // ⚠️ अपने relations के हिसाब से 'with' एडजस्ट कर लेना
      with: {
        items: {
          with: { product: true },
        },
        // अगर deliveryAddress JSON कॉलम है, 'with' की जरूरत नहीं
        // seller: true, // चाहिए तो जोड़ो
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)], // अगर createdAt है
    });

    return res.json({ orders: list });
  } catch (err) {
    console.error("GET /delivery/orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * POST /api/delivery/accept
 * body: { orderId, deliveryBoyId }
 * - केवल pending order accept हो
 * - deliveryBoyId set + 4-digit OTP generate
 */
router.post("/accept", async (req: Request, res: Response) => {
  try {
    const { orderId, deliveryBoyId } = req.body || {};
    if (!orderId || !deliveryBoyId) {
      return res
        .status(400)
        .json({ message: "orderId and deliveryBoyId are required" });
    }

    // ensure order is pending
    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, deliveryStatus: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (existing.deliveryStatus !== "pending") {
      return res
        .status(409)
        .json({ message: "Order is not pending anymore" });
    }

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updated] = await db
      .update(orders)
      .set({
        deliveryBoyId,
        deliveryStatus: "accepted" as any,
        deliveryOtp,
        deliveryAcceptedAt: new Date(), // अगर कॉलम हो
      })
      .where(eq(orders.id, orderId))
      .returning();

    // 🔔 notify all clients to refetch
    io.emit("delivery:orders-changed", {
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
 * body: { orderId, status }  where status ∈ ["picked_up","out_for_delivery","delivered"]
 */
router.post("/update-status", async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body || {};
    if (!orderId || !status) {
      return res
        .status(400)
        .json({ message: "orderId and status are required" });
    }

    const allowed = new Set([
      "picked_up",
      "out_for_delivery",
      "delivered",
    ]);

    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        deliveryStatus: status as any,
        ...(status === "picked_up" && { deliveryPickedAt: new Date() }),
        ...(status === "out_for_delivery" && { deliveryOutAt: new Date() }),
        ...(status === "delivered" && { deliveryCompletedAt: new Date() }),
      })
      .where(eq(orders.id, orderId))
      .returning();

    io.emit("delivery:orders-changed", {
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
 * body: { orderId, otp }
 * - OTP verify → deliveryStatus = delivered
 */
router.post("/complete-delivery", async (req: Request, res: Response) => {
  try {
    const { orderId, otp } = req.body || {};
    if (!orderId || !otp) {
      return res.status(400).json({ message: "orderId and otp are required" });
    }

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, deliveryOtp: true, deliveryStatus: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (existing.deliveryStatus === "delivered") {
      return res.status(409).json({ message: "Order already delivered" });
    }
    if (existing.deliveryOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        deliveryStatus: "delivered" as any,
        deliveryCompletedAt: new Date(),
        deliveryOtp: null, // OTP consume/clear
      })
      .where(eq(orders.id, orderId))
      .returning();

    io.emit("delivery:orders-changed", {
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
