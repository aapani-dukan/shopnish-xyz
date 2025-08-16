//routes/cartRoutes.ts

import { Router, Response } from 'express';
import { db } from '../db.ts';
import {
  users,
  cartItemsPgTable,
  products
} from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest, requireUserAuth } from '../middleware/authMiddleware.ts';

const cartRouter = Router();

// ✅ GET /api/cart - Get user's cart
cartRouter.get('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("🛒 [API] Received GET request for cart.");
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      console.log("❌ [API] Unauthorized: Missing user UUID.");
      return res.status(401).json({ error: 'Unauthorized: Missing user UUID' });
    }

    // 1. Authenticated user के लिए डेटाबेस से यूजर ID प्राप्त करें
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      console.log("❌ [API] User not found for UUID:", firebaseUid);
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. Drizzle का उपयोग करके कार्ट आइटम्स को उनके संबंधित प्रोडक्ट डेटा के साथ प्राप्त करें
    const cartItems = await db.query.cartItemsPgTable.findMany({
      where: eq(cartItemsPgTable.userId, dbUser.id),
      with: {
        product: true, // `products` टेबल से संबंधित डेटा प्राप्त करें
      },
    });

    // 3. डेटा को JSON के रूप में भेजें
    console.log(`✅ [API] Sending cart with ${cartItems.length} items.`);
    return res.status(200).json(cartItems);

  } catch (error) {
    console.error('❌ [API] Error fetching cart:', error);
    // इस त्रुटि को पकड़ें और एक साफ JSON त्रुटि संदेश भेजें
    return res.status(500).json({ error: 'Failed to fetch cart. An unexpected error occurred.' });
  }
});

// ✅ POST /api/cart/add - Add item to cart
cartRouter.post('/add', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    const [existingItem] = await db
      .select()
      .from(cartItemsPgTable)
      .where(eq(cartItemsPgTable.userId, dbUser.id));

    if (existingItem) {
      const updatedItem = await db
        .update(cartItemsPgTable)
        .set({
          quantity: existingItem.quantity + quantity,
        })
        .where(eq(cartItemsPgTable.id, existingItem.id))
        .returning();
      return res.status(200).json({ message: 'Cart item quantity updated.', item: updatedItem[0] });
    } else {
      const newItem = await db
        .insert(cartItemsPgTable)
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
