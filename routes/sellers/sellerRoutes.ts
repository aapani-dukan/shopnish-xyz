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
  orderItems
} from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken.ts';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage.ts'; 

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

// ✅ GET /api/sellers/me
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


 // ✅ POST /api/sellers/apply (Apply as a seller)
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


sellerRouter.post(
  '/categories',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const firebaseUid = req.user?.firebaseUid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
      }
      
      const [sellerProfile] = await db.select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.firebaseUid, firebaseUid));

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


sellerRouter.post(
  '/products',
  requireSellerAuth,
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response) => {
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
        return res.status(404).json({ error: 'Seller profile not found. Please complete your seller registration.' });
      }
      const sellerId = sellerProfile.id;

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

    // ✅ यह क्वेरी `join` का उपयोग करती है और सिंटैक्स एरर को हल करती है
    const ordersWithItems = await db.query.orders.findMany({
      with: {
        orderItems: {
          with: {
            product: {
              columns: {}, // Don't fetch all product columns, just enough to join
              with: {
                seller: true // Find the seller for each product
              },
            },
          },
        },
      },
      where: (orders, { eq, and }) =>
        orders.orderItems.some((item) => eq(item.sellerId, sellerId)), // This syntax is incorrect for Drizzle ORM
      orderBy: [desc(orders.createdAt)],
    });

    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', ordersWithItems.length);
    return res.status(200).json(ordersWithItems);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    console.error(error); 
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});

export default sellerRouter;
