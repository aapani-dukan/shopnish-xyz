import { Router, Response, NextFunction, Request } from 'express';
import { db } from '../../db.ts';
import {
  deliveryBoys,
  orders,
  orderItems,
  products,
  deliveryAddresses,
  approvalStatusEnum,
  orderStatusEnum, // ✅ दोनों एनम (enums) को मिलाया गया है
  users,
  cartItems,
} from '../../../shared/backend/schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import { AuthenticatedRequest, verifyToken } from '../../middleware/verifyToken';
import { requireDeliveryBoyAuth } from '../../middleware/authMiddleware';
import { getIO } from '../../socket.ts';

const router = Router();

// ✅ Delivery Boy Registration Route
// URL: /api/delivery/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, firebaseUid, fullName, vehicleType } = req.body;

    if (!email || !firebaseUid || !fullName || !vehicleType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    let newDeliveryBoy;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      const existingDeliveryBoy = await db.query.deliveryBoys.findFirst({
        where: eq(deliveryBoys.email, email),
      });

      if (existingDeliveryBoy) {
        return res.status(409).json({ message: "A user with this email is already registered as a delivery boy." });
      }

      [newDeliveryBoy] = await db.insert(deliveryBoys).values({
        firebaseUid,
        email,
        name: fullName,
        vehicleType,
        approvalStatus: 'pending',
        userId: existingUser.id,
      }).returning();

    } else {
      const [newUser] = await db.insert(users).values({
        firebaseUid,
        email,
        name: fullName,
        role: 'delivery-boy',
        approvalStatus: 'pending',
      }).returning();

      if (!newUser) {
        return res.status(500).json({ message: "Failed to create new user." });
      }

      [newDeliveryBoy] = await db.insert(deliveryBoys).values({
        firebaseUid,
        email,
        name: fullName,
        vehicleType,
        approvalStatus: 'pending',
        userId: newUser.id,
      }).returning();
    }

    if (!newDeliveryBoy) {
      console.error("❌ Failed to insert new delivery boy into the database.");
      return res.status(500).json({ message: "Failed to submit application. Please try again." });
    }

    getIO().emit("admin:update", { type: "delivery-boy-register", data: newDeliveryBoy });

    return res.status(201).json(newDeliveryBoy);

  } catch (error: any) {
    console.error("❌ Drizzle insert error:", error);
    res.status(400).json({ error: error.message });
  }
});

// ✅ UPDATED: /api/delivery/login (डिलिवरी बॉय लॉगिन)
router.post('/login', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const email = req.user?.email;

    if (!firebaseUid || !email) {
      return res.status(401).json({ message: "Authentication failed. Token missing or invalid." });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid),
      with: {
        user: true,
      }
    });

    if (!deliveryBoy || deliveryBoy.approvalStatus !== 'approved') {
      return res.status(404).json({ message: "Account not found or not approved." });
    }

    if (!deliveryBoy.user || deliveryBoy.user.role !== 'delivery-boy') {
      await db.update(users)
        .set({ role: 'delivery-boy' })
        .where(eq(users.id, deliveryBoy.user.id));
    }

    res.status(200).json({
      message: "Login successful",
      user: deliveryBoy,
    });

  } catch (error: any) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Failed to authenticate. An unexpected error occurred." });
  }
});


// ✅ दोनों फ़ाइलों से मिलाए गए राउट्स
// URL: /api/delivery/orders?deliveryBoyId=UID (पेंडिंग + असाइन किए गए ऑर्डर)
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const deliveryBoyId = String(req.query.deliveryBoyId || "");
    if (!deliveryBoyId) {
      // यह राउट अब केवल deliveryBoyId के साथ काम करेगा
      return res.status(400).json({ message: "deliveryBoyId is required" });
    }

    // Fetch orders: pending + assigned
    const assignedOrders = await db.query.orders.findMany({
      where: or(
        eq(orders.deliveryBoyId, deliveryBoyId),
        and(
          eq(orders.deliveryStatus, "pending" as any),
          isNull(orders.deliveryBoyId)
        )
      ),
      with: {
        items: {
          with: {
            product: true,
            seller: true,
          },
        },
        deliveryAddress: true,
        deliveryBoy: true,
        customer: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    return res.json({ orders: assignedOrders });
  } catch (err) {
    console.error("GET /delivery/orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ✅ ऑर्डर स्वीकार करें
// URL: /api/delivery/accept
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
      columns: { id: true, deliveryStatus: true },
    });

    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.deliveryStatus !== "pending")
      return res.status(409).json({ message: "Order is not pending anymore" });

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updated] = await db
      .update(orders)
      .set({
        deliveryBoyId,
        deliveryStatus: "accepted" as any,
        deliveryOtp,
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

// ✅ ऑर्डर की स्थिति अपडेट करें
// URL: /api/delivery/update-status
router.post("/update-status", async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body || {};
    if (!orderId || !status) {
      return res
        .status(400)
        .json({ message: "orderId and status are required" });
    }

    const allowed = new Set([
      "accepted",
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

// ✅ OTP के साथ डिलीवरी पूरी करें
// URL: /api/delivery/complete-delivery
router.post("/complete-delivery", async (req: Request, res: Response) => {
  try {
    const { orderId, otp } = req.body || {};
    if (!orderId || !otp) {
      return res.status(400).json({ message: "orderId and otp are required" });
    }

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        id: true,
        userId: true,
        deliveryOtp: true,
        deliveryStatus: true,
      },
    });

    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.deliveryStatus === "delivered")
      return res.status(409).json({ message: "Order already delivered" });
    if (existing.deliveryOtp !== otp)
      return res.status(401).json({ message: "Invalid OTP" });

    const [updated] = await db
      .update(orders)
      .set({
        deliveryStatus: "delivered" as any,
        deliveryCompletedAt: new Date(),
        actualDeliveryTime: new Date(),
        deliveryOtp: null,
      })
      .where(eq(orders.id, orderId))
      .returning();

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
