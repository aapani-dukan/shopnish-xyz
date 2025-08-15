// server/routes/sellers/sellerRoutes.ts

import { Router, Response, NextFunction } from 'express';
import { db } from '../../server/db.ts';
import { 
  sellersPgTable, 
  users, 
  userRoleEnum, 
  approvalStatusEnum, 
  categories, 
  products,
  orders,
  ordersToProducts
} from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken.ts';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage.ts'; 

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

// यहाँ से आपके बाकी के राउट
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  // ... यह कोड सही है, इसमें कोई बदलाव नहीं है
});

sellerRouter.post("/apply", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // ... यह कोड सही है, इसमें कोई बदलाव नहीं है
});

sellerRouter.post(
  '/categories',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // ✅ सेलर ID को सही तरीके से प्राप्त करें
      const firebaseUid = req.user?.firebaseUid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
      }

      const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
      if (!dbUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));

      if (!sellerProfile) {
        return res.status(404).json({ error: 'Seller profile not found.' });
      }
      const sellerId = sellerProfile.id;
      
      const { name, slug, description } = req.body;
      const file = req.file;

      if (!name || !slug || !file) {
        return res.status(400).json({ error: 'Category name, slug, and image are required.' });
      }
      
      const imageUrl = await uploadImage(file.path, file.originalname);

      const newCategory = await db
        .insert(categories)
        .values({
          name,
          slug,
          image: imageUrl,
          sellerId: sellerId,
        })
        .returning();

      return res.status(201).json(newCategory[0]);
    } catch (error: any) {
      console.error('❌ Error in POST /api/sellers/categories:', error);
      if (error.message && error.message.includes('duplicate key')) {
        return res.status(409).json({ error: 'Category with this slug already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create category.' });
    }
  }
);


sellerRouter.post( // ✅ यहाँ `sellerRouter` का उपयोग करें
  '/products',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.firebaseUid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
      }

      const sellerProfile = await db
        .select()
        .from(sellersPgTable) // ✅ यहाँ sellersPgTable का उपयोग करें
        .where(eq(sellersPgTable.firebaseUid, firebaseUid));

      if (!sellerProfile || sellerProfile.length === 0) {
        return res.status(404).json({ error: 'Seller profile not found. Please complete your seller registration.' });
      }
      const sellerId = sellerProfile[0].id;

      const { name, description, price, categoryId, stock } = req.body;
      const file = req.file;

      if (!name || !price || !categoryId || !stock || !file) {
        return res.status(400).json({ error: 'Missing required fields or image.' });
      }

      const parsedCategoryId = parseInt(categoryId as string);
      const parsedStock = parseInt(stock as string);
      const parsedPrice = parseFloat(price as string);

      if (isNaN(parsedCategoryId) || isNaN(parsedStock) || isNaN(parsedPrice)) {
        return res.status(400).json({ error: 'Invalid data provided for categoryId, price, or stock.' });
      }

      const imageUrl = await uploadImage(file.path, file.originalname);

      const newProduct = await db
        .insert(products)
        .values({
          name,
          description,
          price: parsedPrice,
          categoryId: parsedCategoryId,
          stock: parsedStock,
          image: imageUrl,
          sellerId: sellerId,
        })
        .returning();

      return res.status(201).json(newProduct[0]);
    } catch (error: any) {
      console.error('❌ Error in POST /api/sellers/products:', error);
      return res.status(500).json({ error: 'Failed to create product.' });
    }
  }
);


sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    const [sellerProfile] = await db
        .select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.firebaseUid, firebaseUid));

    if (!sellerProfile) {
        return res.status(404).json({ error: 'Seller profile not found.' });
    }
    const sellerId = sellerProfile.id;
    console.log('✅ /sellers/orders: Received request for sellerId:', sellerId);

    const sellerOrders = await db.query.orders.findMany({
      where: (order, { inArray }) => inArray(order.id, db.select({ orderId: ordersToProducts.orderId }).from(ordersToProducts).where(eq(ordersToProducts.sellerId, sellerId))),
      orderBy: [desc(orders.createdAt)],
      with: {
        items: true,
      },
    });

    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', sellerOrders.length);
    return res.status(200).json(sellerOrders);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    console.error(error); 
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});

export default sellerRouter;
