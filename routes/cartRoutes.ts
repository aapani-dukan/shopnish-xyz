// routes/cartRoutes.ts

import { Router, Response } from 'express';
import { db } from '../server/db.ts';
import {
  users,
  orderItems, // cartItems की जगह orderItems का उपयोग करें
  products
} from '../shared/backend/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest, requireAuth } from '../server/middleware/authMiddleware.ts';

const cartRouter = Router();

// ✅ GET /api/cart - Get user's cart
cartRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("🛒 [API] Received GET request for cart.");
    const userId = req.user?.id;
    if (!userId) {
      console.log("❌ [API] Unauthorized: Missing user ID.");
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    const cartItemsData = await db.query.orderItems.findMany({
      where: and(eq(orderItems.userId, userId), eq(orderItems.status, 'in_cart')),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            price: true,
            image: true,
            sellerId: true
          }
        },
      },
    });

    const cleanedCartData = cartItemsData.map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: item.product,
    }));

    if (cleanedCartData.length === 0) {
      console.log("✅ [API] Sending empty cart.");
      return res.status(200).json({ message: "Your cart is empty", items: [] });
    }
    
    console.log(`✅ [API] Sending cart with ${cleanedCartData.length} items.`);
    return res.status(200).json({ message: "Cart fetched successfully", items: cleanedCartData });

  } catch (error: any) {
    console.error('❌ [API] Error fetching cart:', error);
    return res.status(500).json({ error: 'Failed to fetch cart. An unexpected error occurred.' });
  }
});

// ✅ POST /api/cart/add - Add a new item to cart
cartRouter.post('/add', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log("🚀 [API] Received POST request to add item to cart.");
  try {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;
    
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    
    const unitPrice = parseFloat(product.price);
    const totalPrice = unitPrice * quantity;

    // ✅ If the item exists in the cart, update it
    const [existingItem] = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.userId, userId), eq(orderItems.productId, productId), eq(orderItems.status, 'in_cart')));

    if (existingItem) {
      const updatedItem = await db
        .update(orderItems)
        .set({
          quantity: existingItem.quantity + quantity,
          totalPrice: existingItem.totalPrice + totalPrice,
        })
        .where(eq(orderItems.id, existingItem.id))
        .returning();
      return res.status(200).json({ message: 'Cart item quantity updated.', item: updatedItem[0] });
    } else {
      // ✅ If the item does not exist, create a new cart entry
      const newItem = await db
        .insert(orderItems)
        .values({
          userId: userId,
          productId: productId,
          sellerId: product.sellerId,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          status: 'in_cart',
        })
        .returning();
      return res.status(201).json({ message: 'Item added to cart.', item: newItem[0] });
    }
  } catch (error: any) {
    console.error('❌ [API] Error adding item to cart:', error);
    return res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

// ✅ PUT /api/cart/:cartItemId - Update quantity of a single item
cartRouter.put('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    console.log("🔄 [API] Received PUT request to update cart item.");
    try {
        const userId = req.user?.id;
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        if (!userId || !quantity || isNaN(parseInt(cartItemId))) {
            return res.status(400).json({ error: 'Invalid or missing fields.' });
        }
        
        const [updatedItem] = await db.update(orderItems)
            .set({ quantity: quantity })
            .where(and(eq(orderItems.id, parseInt(cartItemId)), eq(orderItems.userId, userId), eq(orderItems.status, 'in_cart')))
            .returning();
        
        if (!updatedItem) {
            return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
        }

        return res.status(200).json({ message: 'Cart item updated successfully.', item: updatedItem });

    } catch (error: any) {
        console.error('❌ [API] Error updating cart item:', error);
        return res.status(500).json({ error: 'Failed to update cart item.' });
    }
});

// ✅ DELETE /api/cart/:cartItemId - Remove a single item
cartRouter.delete('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    console.log("🗑️ [API] Received DELETE request to remove cart item.");
    try {
        const userId = req.user?.id;
        const { cartItemId } = req.params;
        
        if (!userId || isNaN(parseInt(cartItemId))) {
            return res.status(400).json({ error: 'Invalid or missing cart item ID.' });
        }

        const [deletedItem] = await db.delete(orderItems)
            .where(and(eq(orderItems.id, parseInt(cartItemId)), eq(orderItems.userId, userId), eq(orderItems.status, 'in_cart')))
            .returning();
        
        if (!deletedItem) {
            return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
        }

        return res.status(200).json({ message: 'Cart item removed successfully.' });

    } catch (error: any) {
        console.error('❌ [API] Error removing cart item:', error);
        return res.status(500).json({ error: 'Failed to remove item from cart.' });
    }
});

export default cartRouter;
