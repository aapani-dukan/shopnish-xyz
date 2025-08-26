import { Request, Response } from 'express';
// ✅ db का सही पथ (Path) सुनिश्चित करें
import { db } from '../db.ts'; 
import { orders, orderItems, products, users, sellersPgTable } from '../../shared/backend/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
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
    
    // ✅ 1. डेटाबेस से "in_cart" वाले आइटम को फ़ेच करें
    const cartItems = await db.query.orderItems.findMany({
      where: and(
        eq(orderItems.userId, userId),
        eq(orderItems.status, 'in_cart')
      ),
      with: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty, cannot place an order." });
    }

    // ✅ 2. टोटल और सबटोटल की गणना करें
    const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const deliveryCharge = 0; // आप इसे req.body से भी प्राप्त कर सकते हैं
    const total = subtotal + deliveryCharge;

    let newOrderId;

    await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      // 3. एक नया ऑर्डर डालें
      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber: orderNumber,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: req.body.paymentMethod || 'COD', // Frontend से पेमेंट मेथड लें
        deliveryAddress: JSON.stringify(req.body.deliveryAddress), // ✅ JSON.stringify का उपयोग करें
      }).returning();
      
      newOrderId = newOrder.id;

      // 4. ऑर्डर आइटम का स्टेटस बदलें और उन्हें नए ऑर्डर से जोड़ें
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

    // ✅ सफल रिस्पांस में orderId को वापस भेजें
    res.status(201).json({ message: "Order placed successfully!", orderId: newOrderId });

  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};


/**
 * Function to get a user's orders (This part of your code seems fine)
 */



export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(401).json({ message: "Unauthorized: Seller not logged in." });
    }

    const [seller] = await db.select().from(sellers).where(eq(sellers.id, sellerId));
    if (!seller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    // ✅ Drizzle से ऑर्डर, आइटम और कस्टमर डेटा फ़ेच करें
    const ordersWithItems = await db.query.orderItems.findMany({
        where: and(
            eq(orderItems.sellerId, seller.id),
            eq(orderItems.status, 'pending')
        ),
        with: {
            order: {
                with: {
                    customer: {
                        // ✅ यहाँ सिर्फ firstName और phone को चुनें
                        columns: {
                            id: true,
                            firstName: true,
                            phone: true
                        }
                    }
                }
            },
            product: true
        }
    });

    // ✅ डेटा को ग्रुप करें और customerName व customerPhone को जोड़ें
    const groupedOrders = ordersWithItems.reduce((acc, item) => {
        const orderId = item.orderId;
        if (!acc[orderId]) {
            acc[orderId] = {
                ...item.order,
                // ✅ यहाँ customerName को firstName से बनाएं
                customerName: item.order.customer.firstName,
                customerPhone: item.order.customer.phone,
                items: [],
            };
        }
        acc[orderId].items.push(item);
        return acc;
    }, {});
    
    const finalOrders = Object.values(groupedOrders);

    res.status(200).json(finalOrders);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};
