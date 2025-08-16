// routes/cartRoutes.ts

import { Router, Response } from 'express';
import { db } from '../server/db.ts';
import {
  users,
  cartItems,
  products
} from '../shared/backend/schema.ts';
import { eq, and } from 'drizzle-orm'; // ✅ 'and' को इंपोर्ट करें
import { AuthenticatedRequest, requireAuth } from '../server/middleware/authMiddleware.ts';

const cartRouter = Router();

// ✅ GET /api/cart - Get user's cart
cartRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("🛒 [API] Received GET request for cart.");
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      console.log("❌ [API] Unauthorized: Missing user UUID.");
      return res.status(401).json({ error: 'Unauthorized: Missing user UUID' });
    }

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      console.log("❌ [API] User not found for UUID:", firebaseUid);
      return res.status(404).json({ error: 'User not found.' });
    }

    const cartItemsData = await db.query.cartItems.findMany({
      where: eq(cartItems.userId, dbUser.id),
      with: {
        product: true,
      },
    });

    const cleanedCartData = cartItemsData.map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        image: item.product.image,
      },
    }));

    if (cleanedCartData.length === 0) {
      console.log("✅ [API] Sending empty cart.");
      return res.status(200).json({ message: "Your cart is empty", items: [] });
    }
    
    console.log(`✅ [API] Sending cart with ${cleanedCartData.length} items.`);
    return res.status(200).json({ message: "Cart fetched successfully", items: cleanedCartData });

  } catch (error) {
    console.error('❌ [API] Error fetching cart:', error);
    return res.status(500).json({ error: 'Failed to fetch cart. An unexpected error occurred.' });
  }
});

// ✅ POST /api/cart/add - Add item to cart
cartRouter.post('/add', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const { productId, quantity } = req.body;
    
    if (!firebaseUid || !productId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // ✅ FIX: `userId` और `productId` दोनों के आधार पर मौजूदा आइटम की जाँच करें
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, dbUser.id), eq(cartItems.productId, productId)));

    if (existingItem) {
      // यदि आइटम पहले से मौजूद है, तो मात्रा अपडेट करें
      const updatedItem = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return res.status(200).json({ message: 'Cart item quantity updated.', item: updatedItem[0] });
    } else {
      // यदि आइटम मौजूद नहीं है, तो एक नई एंट्री बनाएं
      const newItem = await db
        .insert(cartItems)
        .values({
          userId: dbUser.id,
          productId: productId,
          quantity: quantity,
        })
        .returning();
      return res.status(201).json({ message: 'Item added to cart.', item: newItem[0] });
    }
  } catch (error) {
    console.error('❌ [API] Error adding item to cart:', error);
    return res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

export default cartRouter;
