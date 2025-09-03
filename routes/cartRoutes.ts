import { Router, Response } from 'express';
import { db } from '../server/db.ts';
import {
  users,
  orderItems,
  products
} from '../shared/backend/schema.ts';
import { eq, and, inArray } from 'drizzle-orm';
import { AuthenticatedRequest, requireAuth } from '../server/middleware/authMiddleware.ts';
import { getIO } from '../server/socket.ts'; // ✅ socket import

const cartRouter = Router();

// ✅ GET /api/cart - Get user's cart
cartRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("🛒 [API] Received GET request for cart.");
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: Missing user UUID' });
    }

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const cartItemsData = await db.query.orderItems.findMany({
      where: and(eq(orderItems.userId, dbUser.id), eq(orderItems.status, 'in_cart')),
    });

    if (cartItemsData.length === 0) {
      return res.status(200).json({ message: "Your cart is empty", items: [] });
    }

    const productIds = cartItemsData.map(item => item.productId);
    const productsData = await db.query.products.findMany({
      where: inArray(products.id, productIds),
    });

    const productsMap = new Map(productsData.map(product => [product.id, product]));

    const cleanedCartData = cartItemsData.map(item => {
      const product = productsMap.get(item.productId);
      if (!product) return null;
      return {
        id: item.id,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          sellerId: product.sellerId,
        },
      };
    }).filter(item => item !== null);

    return res.status(200).json({ message: "Cart fetched successfully", items: cleanedCartData });

  } catch (error: any) {
    console.error('❌ [API] Error fetching cart:', error);
    return res.status(500).json({ error: 'Failed to fetch cart. An unexpected error occurred.' });
  }
});

// ✅ POST /api/cart/add - Add a new item to cart
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

    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const unitPrice = parseFloat(product.price);
    const totalPrice = unitPrice * quantity;
    const sellerId = product.sellerId;

    const [existingItem] = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.userId, dbUser.id), eq(orderItems.productId, productId), eq(orderItems.status, 'in_cart')));

    let item;
    if (existingItem) {
      const updatedItem = await db
        .update(orderItems)
        .set({
          quantity: existingItem.quantity + quantity,
          totalPrice: existingItem.totalPrice + totalPrice,
        })
        .where(eq(orderItems.id, existingItem.id))
        .returning();
      item = updatedItem[0];
    } else {
      const newItem = await db
        .insert(orderItems)
        .values({
          userId: dbUser.id,
          productId,
          quantity,
          unitPrice,
          totalPrice,
          sellerId,
          status: 'in_cart',
        })
        .returning();
      item = newItem[0];
    }

    // ✅ socket event
    getIO().emit("cart:updated", { userId: dbUser.id });

    return res.status(200).json({ message: 'Item added to cart.', item });
  } catch (error: any) {
    console.error('❌ [API] Error adding item to cart:', error);
    return res.status(500).json({ error: 'Failed to add item to cart.' });
  }
});

// ✅ PUT /api/cart/:cartItemId - Update quantity
cartRouter.put('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const [updatedItem] = await db.update(orderItems)
      .set({ quantity })
      .where(and(eq(orderItems.id, parseInt(cartItemId)), eq(orderItems.userId, dbUser.id), eq(orderItems.status, 'in_cart')))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
    }

    // ✅ socket event
    getIO().emit("cart:updated", { userId: dbUser.id });

    return res.status(200).json({ message: 'Cart item updated successfully.', item: updatedItem });
  } catch (error: any) {
    console.error('❌ [API] Error updating cart item:', error);
    return res.status(500).json({ error: 'Failed to update cart item.' });
  }
});

// ✅ DELETE /api/cart/:cartItemId - Remove a single item
cartRouter.delete('/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const [deletedItem] = await db.delete(orderItems)
      .where(and(eq(orderItems.id, parseInt(cartItemId)), eq(orderItems.userId, dbUser.id), eq(orderItems.status, 'in_cart')))
      .returning();

    if (!deletedItem) {
      return res.status(404).json({ message: 'Cart item not found or does not belong to user.' });
    }

    // ✅ socket event
    getIO().emit("cart:updated", { userId: dbUser.id });

    return res.status(200).json({ message: 'Cart item removed successfully.' });
  } catch (error: any) {
    console.error('❌ [API] Error removing cart item:', error);
    return res.status(500).json({ error: 'Failed to remove item from cart.' });
  }
});

export default cartRouter;
