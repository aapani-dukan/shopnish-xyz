import { Router, Response, NextFunction } from 'express';
import { db } from '../server/db';
import {
  deliveryBoys,
  orders,
  orderItems,
  products,
  deliveryAddresses,
  approvalStatusEnum,
  orderStatusEnum,
  users
} from '../shared/backend/schema';
import { eq, or, and, isNull } from 'drizzle-orm';
import { AuthenticatedRequest, verifyToken } from '../server/middleware/verifyToken';
import { requireDeliveryBoyAuth } from '../server/middleware/authMiddleware';
import { getIO } from '../server/socket';

const router = Router();

// ✅ Delivery Boy Registration Route
// URL: /api/delivery-boys/register
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

// ✅ UPDATED: /api/delivery/orders (डिलिवरी बॉय के ऑर्डर)
// यह उन ऑर्डरों को फ़ेच करेगा जो 'ready_for_pickup' हैं और किसी को असाइन नहीं किए गए हैं।
// ✅ AVAILABLE Orders (Unassigned + Ready for Pickup)
router.get('/orders/available', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'ready_for_pickup'),
        isNull(orders.deliveryBoyId)
      ),
      with: {
        items: { with: { product: { with: { seller: true } } } },
        deliveryAddress: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    console.log("✅ Available orders fetched:", list.length);

    res.status(200).json({ orders: list });
  } catch (error: any) {
    console.error("❌ Failed to fetch available orders:", error);
    res.status(500).json({ message: "Failed to fetch available orders." });
  }
});

// ✅ MY Orders (Assigned to this Delivery Boy)
router.get('/orders/my', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ message: "Authentication required." });
    }
    
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }

    const list = await db.query.orders.findMany({
      where: eq(orders.deliveryBoyId, deliveryBoy.id),
      with: {
        items: { with: { product: { with: { seller: true } } } },
        deliveryAddress: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    console.log("✅ My orders fetched:", list.length);

    res.status(200).json({ orders: list });
  } catch (error: any) {
    console.error("❌ Failed to fetch my orders:", error);
    res.status(500).json({ message: "Failed to fetch my orders." });
  }
});

// ✅ UPDATED: /api/delivery/orders/:orderId/status (ऑर्डर की स्थिति अपडेट करें)
// अब यह केवल 'status' कॉलम को अपडेट करता है
router.patch('/orders/:orderId/status', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const orderId = Number(req.params.orderId);
    const { newStatus } = req.body;

    if (!orderId || !newStatus || !firebaseUid) {
      return res.status(400).json({ message: "Order ID and status are required." });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }

    // डिलीवरी बॉय के लिए मान्य स्थितियों की सूची
    const validStatusesForDeliveryBoy = ['picked_up', 'out_for_delivery'];
    if (!validStatusesForDeliveryBoy.includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (order?.deliveryBoyId !== deliveryBoy.id) {
      return res.status(403).json({ message: "Forbidden: You are not assigned to this order." });
    }

    const [updatedOrder] = await db.update(orders)
      .set({ status: newStatus as typeof orderStatusEnum.enumValues[number] })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });

    getIO().emit("order:update", { type: "status-change", data: updatedOrder });

  } catch (error: any) {
    console.error("Failed to update order status:", error);
    res.status(500).json({ message: "Failed to update order status." });
  }
});

// ✅ UPDATED: /api/delivery/orders/:orderId/complete-delivery (OTP के साथ डिलीवरी पूरी करें)
router.post('/orders/:orderId/complete-delivery', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const orderId = Number(req.params.orderId);
    const { otp } = req.body;

    if (!orderId || !otp || !firebaseUid) {
      return res.status(400).json({ message: "Order ID and OTP are required." });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.deliveryBoyId !== deliveryBoy.id) {
      return res.status(403).json({ message: "Forbidden: You are not assigned to this order." });
    }

    if (order.deliveryOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    const [updatedOrder] = await db.update(orders)
      .set({
        status: 'delivered', // अब केवल 'status' कॉलम अपडेट हो रहा है
        deliveryOtp: null,
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.status(200).json({
      message: "Delivery completed successfully.",
      order: updatedOrder,
    });

    getIO().emit("order:update", { type: "delivered", data: updatedOrder });

  } catch (error: any) {
    console.error("Failed to complete delivery:", error);
    res.status(500).json({ message: "Failed to complete delivery." });
  }
});

// ✅ POST /api/delivery/accept (ऑर्डर स्वीकार करें)
router.post("/accept", requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const { orderId } = req.body || {};
    
    if (!orderId || !firebaseUid) {
      return res
        .status(400)
        .json({ message: "orderId is required" });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { id: true, status: true, deliveryBoyId: true }, // केवल 'status' कॉलम का उपयोग
    });

    if (!existing) return res.status(404).json({ message: "Order not found" });

    // जाँचें कि ऑर्डर 'ready_for_pickup' है और किसी को असाइन नहीं किया गया है
    if (existing.status !== 'ready_for_pickup' || existing.deliveryBoyId !== null) {
      return res.status(409).json({ message: "Order is not available for acceptance." });
    }

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const [updated] = await db
      .update(orders)
      .set({
        deliveryBoyId: deliveryBoy.id,
        status: "accepted", // अब 'status' कॉलम अपडेट हो रहा है
        deliveryOtp,
        deliveryAcceptedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    getIO().emit("order:update", {
      reason: "accepted",
      orderId,
      deliveryBoyId: deliveryBoy.id,
    });

    return res.json({ message: "Order accepted", order: updated });
  } catch (err) {
    console.error("POST /delivery/accept error:", err);
    return res.status(500).json({ message: "Failed to accept order" });
  }
});

export default router;

