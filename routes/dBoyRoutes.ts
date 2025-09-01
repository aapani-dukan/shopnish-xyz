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
  users // ✅ users table को जोड़ा
} from '../shared/backend/schema';
import { eq, sql } from 'drizzle-orm';
import { AuthenticatedRequest, verifyToken } from '../server/middleware/verifyToken';
import { requireDeliveryBoyAuth } from '../server/middleware/authMiddleware';

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

// ✅ UPDATED: /api/delivery/orders (ऑर्डर फ़ेच करें)
// अब यह `firebaseUid` का उपयोग करके सही `deliveryBoyId` का पता लगाता है।
router.get('/orders', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;

    if (!firebaseUid) {
      return res.status(401).json({ message: "Unauthorized. Firebase UID is required." });
    }

    // पहले firebaseUid का उपयोग करके deliveryBoyId खोजें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid)
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }

    const assignedOrders = await db.query.orders.findMany({
      where: eq(orders.deliveryBoyId, deliveryBoy.id),
      with: {
        items: {
          with: {
            product: true,
          }
        },
        deliveryAddress: true,
      },
    });

    res.status(200).json(assignedOrders);
  } catch (error: any) {
    console.error("Failed to fetch assigned orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

// ✅ UPDATED: /api/delivery/orders/:orderId/status (ऑर्डर की स्थिति अपडेट करें)
// अब यह `firebaseUid` का उपयोग करके सही `deliveryBoyId` का पता लगाता है।
router.patch('/orders/:orderId/status', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    if (!orderId || !status || !firebaseUid) {
      return res.status(400).json({ message: "Order ID and status are required." });
    }

    // पहले firebaseUid का उपयोग करके deliveryBoyId खोजें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid)
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy profile not found." });
    }
    
    const validStatuses = orderStatusEnum.enumValues;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }
    
    // सुनिश्चित करें कि ऑर्डर उसी डिलीवरी बॉय को असाइन किया गया है
    const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
    });

    if (order?.deliveryBoyId !== deliveryBoy.id) {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this order." });
    }
    
    const [updatedOrder] = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    res.status(500).json({ message: "Failed to update order status." });
  }
});

// ✅ UPDATED: /api/delivery/orders/:orderId/complete-delivery (OTP के साथ डिलीवरी पूरी करें)
// अब यह `firebaseUid` का उपयोग करके सही `deliveryBoyId` का पता लगाता है।
router.post('/orders/:orderId/complete-delivery', requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const orderId = Number(req.params.orderId);
    const { otp } = req.body;

    if (!orderId || !otp || !firebaseUid) {
      return res.status(400).json({ message: "Order ID and OTP are required." });
    }

    // पहले firebaseUid का उपयोग करके deliveryBoyId खोजें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.firebaseUid, firebaseUid)
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
    
    // सुनिश्चित करें कि ऑर्डर उसी डिलीवरी बॉय को असाइन किया गया है
    if (order.deliveryBoyId !== deliveryBoy.id) {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this order." });
    }

    if (order.deliveryOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    const [updatedOrder] = await db.update(orders)
      .set({ 
        status: 'delivered', 
        deliveryOtp: null 
      })
      .where(eq(orders.id, orderId))
      .returning();

    res.status(200).json({
      message: "Delivery completed successfully.",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Failed to complete delivery:", error);
    res.status(500).json({ message: "Failed to complete delivery." });
  }
});

export default router;
