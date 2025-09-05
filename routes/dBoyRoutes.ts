import { Router, Request, Response } from "express";
import { db } from "../server/db";
import { orders } from "../shared/backend/schema";
import { eq } from "drizzle-orm";
import { verifyToken, requireDeliveryBoyAuth } from "../middleware/auth";

const router = Router();

/**
 * POST /api/delivery/register
 * → Naya delivery boy register karo
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { firebaseUid, email, name } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ message: "firebaseUid and email required" });
    }

    const existing = await db.query.deliveryBoys.findFirst({
      where: (d, { eq }) => eq(d.firebaseUid, firebaseUid),
    });

    if (existing) {
      return res.json({ deliveryBoy: existing });
    }

    const [newDeliveryBoy] = await db
      .insert(db.deliveryBoys)
      .values({
        firebaseUid,
        email,
        name,
        approved: false,
        createdAt: new Date(),
      })
      .returning();

    return res.json({ deliveryBoy: newDeliveryBoy });
  } catch (err) {
    console.error("POST /delivery/register error:", err);
    return res.status(500).json({ message: "Failed to register delivery boy" });
  }
});

/**
 * POST /api/delivery/login
 * → Delivery boy login (must be approved)
 */
router.post("/login", verifyToken, async (req: Request, res: Response) => {
  try {
    const { firebaseUid } = req.body;

    if (!firebaseUid) {
      return res.status(400).json({ message: "firebaseUid required" });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: (d, { eq }) => eq(d.firebaseUid, firebaseUid),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found" });
    }

    if (!deliveryBoy.approved) {
      return res.status(403).json({ message: "Delivery boy not approved yet" });
    }

    return res.json({ deliveryBoy });
  } catch (err) {
    console.error("POST /delivery/login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

/**
 * ✅ GET /api/delivery/all-orders
 * → Admin ke liye: sabhi orders (with details)
 */
router.get("/all-orders", async (req: Request, res: Response) => {
  try {
    const list = await db.query.orders.findMany({
      with: {
        items: { with: { product: true } },
        seller: true,
        user: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    return res.json({ orders: list });
  } catch (err) {
    console.error("GET /delivery/all-orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * PATCH /api/delivery/orders/:orderId/status
 * → Update order status (delivery boy only)
 */
router.patch(
  "/orders/:orderId/status",
  verifyToken,
  requireDeliveryBoyAuth,
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const updated = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, Number(orderId)))
        .returning();

      return res.json({ order: updated[0] });
    } catch (err) {
      console.error("PATCH /delivery/orders/:orderId/status error:", err);
      return res.status(500).json({ message: "Failed to update order status" });
    }
  }
);

/**
 * POST /api/delivery/orders/:orderId/complete-delivery
 * → OTP verify karke delivery complete
 */
router.post(
  "/orders/:orderId/complete-delivery",
  verifyToken,
  requireDeliveryBoyAuth,
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { otp } = req.body;

      // TODO: OTP verify karo
      if (!otp) {
        return res.status(400).json({ message: "OTP required" });
      }

      const updated = await db
        .update(orders)
        .set({ status: "delivered" })
        .where(eq(orders.id, Number(orderId)))
        .returning();

      return res.json({ order: updated[0] });
    } catch (err) {
      console.error("POST /delivery/orders/:orderId/complete-delivery error:", err);
      return res.status(500).json({ message: "Failed to complete delivery" });
    }
  }
);

export default router;
