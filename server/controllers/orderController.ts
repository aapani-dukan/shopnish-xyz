import { Request, Response } from 'express';
// ✅ db का सही पथ (Path) सुनिश्चित करें
import { db } from '../db.ts'; 
import { orders, orderItems } from '../../shared/backend/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * ग्राहक के लिए एक नया ऑर्डर प्लेस करने का फ़ंक्शन।
 * इस फ़ंक्शन में अतिरिक्त लॉगिंग जोड़ी गई है ताकि हम डेटा प्रवाह (data flow) को देख सकें।
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place order.");
  console.log("📋 [API] Request Body:", req.body); // ✅ यह लॉग हमें इनकमिंग डेटा दिखाएगा

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("⚠️ [API] Unauthorized: User ID missing.");
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }
    
    // ✅ 1. डेटाबेस से "in_cart" वाले आइटम को फ़ेच करें।
    const cartItems = await db.query.orderItems.findMany({
      where: and(
        eq(orderItems.userId, userId),
        eq(orderItems.status, 'in_cart')
      ),
      with: { product: true },
    });

    if (cartItems.length === 0) {
      console.log("🛒 [API] Cart is empty, cannot place an order.");
      return res.status(400).json({ message: "Cart is empty, cannot place an order." });
    }

    // ✅ 2. टोटल और सबटोटल की गणना करें।
    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const deliveryCharge = parseFloat(req.body.deliveryCharge) || 0;
    const total = subtotal + deliveryCharge;

    let newOrderId;

    await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      // ✅ 3. यहाँ deliveryAddress को JSON स्ट्रिंग में बदलें।
      const serializedDeliveryAddress = JSON.stringify(req.body.deliveryAddress);
      
      console.log("🚚 [API] Serializing deliveryAddress:", req.body.deliveryAddress); // ✅ ऑब्जेक्ट देखें
      console.log("📦 [API] Serialized String:", serializedDeliveryAddress); // ✅ स्ट्रिंग देखें

      // 4. एक नया ऑर्डर डालें।
      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber: orderNumber,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: req.body.paymentMethod || 'COD',
        deliveryAddress: serializedDeliveryAddress,
        deliveryInstructions: req.body.deliveryInstructions,
      }).returning();
      
      newOrderId = newOrder.id;

      // 5. कार्ट आइटम का स्टेटस बदलें।
      await tx.update(orderItems)
        .set({
          status: 'pending',
          orderId: newOrder.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(orderItems.userId, userId),
          eq(orderItems.status, 'in_cart')
        ));
    });

    res.status(201).json({ message: "Order placed successfully!", orderId: newOrderId });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};


/**
 * ग्राहक के सभी ऑर्डर फ़ेच करने का फ़ंक्शन (इसमें कोई बदलाव नहीं किया गया है)।
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const ordersWithItems = await db.query.orders.findMany({
      where: eq(orders.customerId, userId),
      with: {
        items: {
          with: {
            product: {
              with: {
                seller: true
              }
            }
          }
        }
      },
      orderBy: [desc(orders.createdAt)],
    });
    
    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
