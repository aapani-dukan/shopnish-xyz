// routes/cartRoutes.ts

import { Router, Response } from 'express';
import { db } from '../server/db.ts';
import {
  users,
  cartItems,
  products
} from '../shared/backend/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest, requireAuth } from '../server/middleware/authMiddleware.ts';

const cartRouter = Router();

// ✅ GET /api/cart - Get user's cart
cartRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // ... (आपका मौजूदा GET रूट)
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
        sellerId: item.product.sellerId, 
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

// ✅ POST /api/cart/add - Add a new item to cart
cartRouter.post('/add', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received POST request to add item to cart.");
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
    
    // ✅ यदि आइटम मौजूद है, तो 200 (OK) रिस्पॉन्स के साथ अपडेट करें।
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, dbUser.id), eq(cartItems.productId, productId)));

    if (existingItem) {
      const updatedItem = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return res.status(200).json({ message: 'Cart item quantity updated.', item: updatedItem[0] });
    } else {
      // ✅ यदि आइटम मौजूद नहीं है, तो 201 (Created) रिस्पॉन्स के साथ एक नई एंट्री बनाएं
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

// ✅ नया PUT रूट: /api/cart/:cartItemId - Update quantity of a single item
cartRouter.put('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    console.log("🔄 [API] Received PUT request to update cart item.");
    try {
        const firebaseUid = req.user?.firebaseUid;
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        if (!firebaseUid || !quantity || isNaN(parseInt(cartItemId))) {
            return res.status(400).json({ error: 'Invalid or missing fields.' });
        }
        
        const [dbUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.firebaseUid, firebaseUid));

        if (!dbUser) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        const [updatedItem] = await db.update(cartItems)
            .set({ quantity: quantity })
            .where(and(eq(cartItems.id, parseInt(cartItemId)), eq(cartItems.userId, dbUser.id)))
            .returning();
        
        if (!updatedItem) {
            return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
        }

        return res.status(200).json({ message: 'Cart item updated successfully.', item: updatedItem });

    } catch (error) {
        console.error('❌ [API] Error updating cart item:', error);
        return res.status(500).json({ error: 'Failed to update cart item.' });
    }
});

// ✅ नया DELETE रूट: /api/cart/:cartItemId - Remove a single item
cartRouter.delete('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    console.log("🗑️ [API] Received DELETE request to remove cart item.");
    try {
        const firebaseUid = req.user?.firebaseUid;
        const { cartItemId } = req.params;
        
        if (!firebaseUid || isNaN(parseInt(cartItemId))) {
            return res.status(400).json({ error: 'Invalid or missing cart item ID.' });
        }

        const [dbUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.firebaseUid, firebaseUid));

        if (!dbUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const [deletedItem] = await db.delete(cartItems)
            .where(and(eq(cartItems.id, parseInt(cartItemId)), eq(cartItems.userId, dbUser.id)))
            .returning();
        
        if (!deletedItem) {
            return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
        }

        return res.status(200).json({ message: 'Cart item removed successfully.' });

    } catch (error) {
        console.error('❌ [API] Error removing cart item:', error);
        return res.status(500).json({ error: 'Failed to remove item from cart.' });
    }
});


export default cartRouter;
