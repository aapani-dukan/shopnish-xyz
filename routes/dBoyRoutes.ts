// shopnish-xyz/routes/dboyRoutes.ts

import { Router, Request, Response } from 'express';
import { db } from '../server/db.ts';
import {
  deliveryBoys,
  orders,
  orderItems,
  products,
  deliveryAddresses,
  approvalStatusEnum,
  orderStatusEnum
} from '../shared/backend/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { getAuth } from 'firebase-admin/auth';

const router = Router();

// ✅ Delivery Boy Registration Route
// URL: /api/delivery-boys/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, firebaseUid, name, vehicleType } = req.body;

    const existingDeliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.email, email),
    });

    if (existingDeliveryBoy) {
      return res.status(409).json({ message: "A user with this email is already registered." });
    }

    const [newDeliveryBoy] = await db.insert(deliveryBoys).values({
      firebaseUid: firebaseUid,
      email,
      name: name || 'Delivery Boy',
      vehicleType,
      approvalStatus: 'pending',
    }).returning();

    res.status(201).json(newDeliveryBoy);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ---

// ✅ Delivery Boy Login Route
// ✅ Delivery Boy Login Route
// URL: /api/delivery-boys/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication token missing." });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const userEmail = decodedToken.email;

    if (userEmail !== email) {
      return res.status(401).json({ message: "Invalid token or email." });
    }

    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.email, email),
    });

    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found. Please register first." });
    }

    if (!deliveryBoy.firebaseUid) {
      await db.update(deliveryBoys)
        .set({ firebaseUid })
        .where(eq(deliveryBoys.email, email));
    }

    res.status(200).json({
      message: "Login successful",
      user: deliveryBoy,
    });

  } catch (error: any) {
    console.error("Login failed:", error);
    // ✅ सुनिश्चित करें कि catch block में हमेशा JSON response ही भेजी जाए
    const status = (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') ? 401 : 500;
    const message = (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') 
      ? "Authentication failed. Please log in again."
      : "Failed to authenticate. An unexpected error occurred."; // ✅ एक सामान्य त्रुटि संदेश
    
    res.status(status).json({ message });
  }
});


// ✅ Get Assigned Orders Route
// URL: /api/delivery-boys/orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { deliveryBoyId } = req.query;

    if (!deliveryBoyId) {
      return res.status(400).json({ message: "Delivery Boy ID is required." });
    }

    const assignedOrders = await db.query.orders.findMany({
      where: eq(orders.deliveryBoyId, Number(deliveryBoyId)),
      with: {
        orderItems: {
          with: {
            product: true,
          }
        },
        deliveryAddress: true,
      },
    });

    const serializedOrders = assignedOrders.map(order => ({
      ...order,
      total: Number(order.total),
      deliveryAddress: {
        ...order.deliveryAddress,
        currentLat: Number(order.deliveryAddress.currentLat),
        currentLng: Number(order.deliveryAddress.currentLng),
      },
      items: order.orderItems.map(item => ({
        ...item,
        quantity: Number(item.quantity)
      }))
    }));

    res.status(200).json(serializedOrders);
  } catch (error: any) {
    console.error("Failed to fetch assigned orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

// ---

// ✅ Update Order Status Route
// URL: /api/delivery-boys/orders/:orderId/status
router.patch('/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ message: "Order ID and status are required." });
    }

    const validStatuses = orderStatusEnum.enumValues;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
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

// ---

// ✅ Complete Delivery Route with OTP
// URL: /api/delivery-boys/orders/:orderId/complete-delivery
router.post('/orders/:orderId/complete-delivery', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.orderId);
    const { otp } = req.body;

    if (!orderId || !otp) {
      return res.status(400).json({ message: "Order ID and OTP are required." });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // OTP की जाँच करें
    if (order.deliveryOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    // यदि OTP सही है, तो स्टेटस को 'delivered' पर अपडेट करें
    const [updatedOrder] = await db.update(orders)
      .set({ 
        status: 'delivered', 
        deliveryOtp: null // OTP को हटा दें ताकि इसे दोबारा इस्तेमाल न किया जा सके
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
