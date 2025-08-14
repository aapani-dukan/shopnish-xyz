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
  orders, // ✅ orders स्कीमा को इंपोर्ट करें
  ordersToProducts // ✅ अगर आपके पास यह स्कीमा है तो इसे भी इंपोर्ट करें
} from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken.ts';
import { eq, desc } from 'drizzle-orm'; // ✅ desc को इंपोर्ट करें
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage.ts'; 

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

/**
 * ✅ GET /api/sellers/me
 * Authenticated route to get the current seller profile
 */
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    const [seller] = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, dbUser.id));

    if (!seller) {
      return res.status(404).json({ message: 'Seller profile not found.' });
    }

    return res.status(200).json(seller);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/me:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * ✅ POST /api/sellers/apply (Apply as a seller)
 */
sellerRouter.post("/apply", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Received seller apply data:', req.body);

    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) return res.status(401).json({ message: "Unauthorized" });

    const {
      businessName,
      businessAddress,
      businessPhone,
      description,
      city,
      pincode,
      gstNumber,
      bankAccountNumber,
      ifscCode,
      deliveryRadius,
      businessType,
    } = req.body;

    if (!businessName || !businessPhone || !city || !pincode || !businessAddress || !businessType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);

    if (!dbUser) return res.status(404).json({ message: "User not found." });

    const [existing] = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, dbUser.id));

    if (existing) {
      return res.status(400).json({
        message: "Application already submitted.",
        status: existing.approvalStatus,
      });
    }

    const newSeller = await db
      .insert(sellersPgTable)
      .values({
        userId: dbUser.id,
        businessName,
        businessAddress,
        businessPhone,
        description: description || null,
        city,
        pincode,
        gstNumber: gstNumber || null,
        bankAccountNumber: bankAccountNumber || null,
        ifscCode: ifscCode || null,
        deliveryRadius: deliveryRadius ? parseInt(String(deliveryRadius)) : null,
        businessType,
        approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
        applicationDate: new Date(),
      })
      .returning();

    const [updatedUser] = await db
      .update(users)
      .set({
        role: userRoleEnum.enumValues[1], // 'seller'
        approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
      })
      .where(eq(users.id, dbUser.id))
      .returning();

    return res.status(201).json({
      message: "Application submitted.",
      seller: newSeller[0],
      user: {
        firebaseUid: updatedUser.firebaseUid,
        role: updatedUser.role,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in POST /api/sellers:", error);
    next(error);
  }
});

/**
 * ✅ POST /api/sellers/categories
 * Authenticated route to allow a seller to add a new category with an image.
 */
sellerRouter.post(
  '/categories',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({ error: 'Unauthorized: Seller ID not found.' });
      }
      
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

/**
 * ✅ POST /api/sellers/products
 * Authenticated route to allow a seller to add a new product with an image.
 */
sellerRouter.post(
  '/products',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        return res.status(401).json({ error: 'Unauthorized: Seller ID not found.' });
      }

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

/**
 * ✅ GET /api/sellers/orders - नया जोड़ा गया राउट
 * Authenticated route to get all orders for the current seller.
 */
// server/routes/sellers/sellerRoutes.ts


sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id;
    console.log('✅ /sellers/orders: Received request for sellerId:', sellerId); // ✅ नया लॉग

    if (!sellerId) {
      return res.status(401).json({ error: 'Unauthorized: Seller ID not found.' });
    }

    const sellerOrders = await db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      orderBy: [desc(orders.createdAt)],
      with: {
        items: true,
      },
    });

    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', sellerOrders.length); // ✅ नया लॉग
    return res.status(200).json(sellerOrders);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    // ✅ यहाँ full error object को लॉग करें
    console.error(error); 
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});

export default sellerRouter;

 
