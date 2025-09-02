import { Request, Response } from 'express';
// ✅ db का सही पथ (Path) सुनिश्चित करें
import { db } from '../db.ts';
import { orders, orderItems, deliveryAddresses } from '../../shared/backend/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * ग्राहक के लिए एक नया ऑर्डर प्लेस करने का फ़ंक्शन।
 * यह अब डेटाबेस स्कीमा के अनुरूप है।
 */
export const placeOrder = async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received request to place order.");
  console.log("📋 [API] Request Body:", req.body);

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("⚠️ [API] Unauthorized: User ID missing.");
      return res.status(401).json({ message: "Unauthorized: User not logged in." });
    }

    const { deliveryAddress, paymentMethod, deliveryInstructions, items, subtotal, total, deliveryCharge } = req.body;

    // ✅ लॉजिक अपडेट: अब हम सीधे रिक्वेस्ट बॉडी से 'items' का उपयोग कर रहे हैं।
    if (!items || items.length === 0) {
      console.log("🛒 [API] Items list is empty, cannot place an order.");
      return res.status(400).json({ message: "Items list is empty, cannot place an order." });
    }

    let newOrderId;
    let newDeliveryAddressId;

    await db.transaction(async (tx) => {
      const orderNumber = `ORD-${uuidv4()}`;

      // ✅ STEP 1: deliveryAddresses टेबल में नया पता डालें।
      const [newAddress] = await tx.insert(deliveryAddresses).values({
        userId: userId,
        fullName: deliveryAddress.fullName,
        phoneNumber: deliveryAddress.phone,
        addressLine1: deliveryAddress.address,
        addressLine2: deliveryAddress.landmark, //landmark को addressLine2 में डालें
        city: deliveryAddress.city,
        postalCode: deliveryAddress.pincode,
        state: "Rajasthan", // frontend से state भी प्राप्त करें
      }).returning();
      
      newDeliveryAddressId = newAddress.id;

      // ✅ STEP 2: orders टेबल में नया ऑर्डर डालें, अब deliveryAddressId का उपयोग करके।
      const [newOrder] = await tx.insert(orders).values({
        customerId: userId,
        status: "pending",
        orderNumber: orderNumber,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: paymentMethod || 'COD',
        deliveryAddressId: newDeliveryAddressId, // ✅ यहाँ सही ID का उपयोग करें
        deliveryInstructions: deliveryInstructions,
        deliveryCharge: deliveryCharge, // डिलीवरी चार्ज को भी यहाँ डालें
      }).returning();
      
      newOrderId = newOrder.id;

      // ✅ STEP 3: रिक्वेस्ट बॉडी से प्रत्येक आइटम के लिए orderItems रिकॉर्ड डालें।
      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId, // रिक्वेस्ट बॉडी में productId नहीं है, यह एक समस्या है
          sellerId: item.sellerId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }

      // ✅ STEP 4 (वैकल्पिक): यदि आपके पास कार्ट के लिए एक अलग टेबल है, तो उसे यहाँ साफ़ करें।
      // यह कोड आपकी मौजूदा समस्या का हिस्सा नहीं है, लेकिन एक अच्छे डिज़ाइन के लिए महत्वपूर्ण है।
      // await tx.delete(cartItems).where(eq(cartItems.userId, userId));
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
