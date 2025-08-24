import { Request, Response } from 'express';
import { db } from '../db.ts';
import { orders, orderItems, cartItems, products } from '../../shared/backend/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';

// ✅ नया इम्पोर्ट
import { v4 as uuidv4 } from 'uuid';

/**
 * Function to place a new order
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { deliveryAddress, paymentMethod, items, subtotal, total, deliveryCharge } = req.body;

    // ✅ डेटा सत्यापन
    if (!items || items.length === 0 || subtotal === undefined || total === undefined) {
      return res.status(400).json({ message: "Missing required order details." });
    }

    // ✅ ट्रांजेक्शन शुरू करें
    await db.transaction(async (tx) => {
      // ✅ एक अद्वितीय ऑर्डर नंबर जेनरेट करें
      const orderNumber = `ORD-${uuidv4()}`;

      // ✅ एक नया ऑर्डर डालें
      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "placed",
        orderNumber: orderNumber,
        subtotal: total - (deliveryCharge || 0),
        total: total,
        deliveryCharge: deliveryCharge || 0,
        deliveryAddress: JSON.stringify(deliveryAddress),
        paymentMethod: paymentMethod,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      const orderId = newOrder.id;

      // ✅ ऑर्डर आइटम डालें
      const orderItemsData = items.map((item: any) => ({
        orderId: orderId,
        productId: item.productId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await tx.insert(orderItems).values(orderItemsData);

      // ✅ कार्ट को साफ़ करें
      await tx.delete(cartItems).where(eq(cartItems.userId, userId));
      
    });

    res.status(201).json({
      message: "Order placed successfully!",
      // ✅ अब orderId को response में शामिल न करें क्योंकि transaction से बाहर है
      // orderId: newOrder.id,
    });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

/**
 * Function to get a user's orders
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
            // `product` के साथ `seller` को भी शामिल करें
            product: { with: { seller: true } },
          },
        },
      },
      orderBy: [desc(orders.createdAt)],
    });

    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
