// server/routes/sellers/sellerRoutes.ts

import { Router, Response, NextFunction } from 'express';
import { db } from '../../server/db';
import {
  sellersPgTable,
  users,
  userRoleEnum,
  approvalStatusEnum,
  categories,
  products,
  orders,
  orderItems,
  orderStatusEnum,
} from '../../shared/backend/schema';
import { requireSellerAuth } from '../../server/middleware/authMiddleware';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken';
import { eq, desc, and, exists } from 'drizzle-orm';
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage';
import { v4 as uuidv4 } from "uuid";

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

/**
 * ✅ GET /api/sellers/me
 */
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    const userId = req.user?.id;

    if (!firebaseUid || !userId) {
      return res.status(401).json({ error: 'Unauthorized: Missing user data.' });
    }

    const [userWithSeller] = await db.query.users.findMany({
      where: eq(users.id, userId),
      with: {
        seller: true
      }
    });

    if (!userWithSeller || !userWithSeller.seller) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    return res.status(200).json(userWithSeller.seller);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/me:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * ✅ GET /api/sellers/orders (विक्रेता के लिए ऑर्डर्स फ़ेच करें)
 */
sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
        if (!sellerProfile) {
            return res.status(404).json({ error: 'Seller profile not found.' });
        }
        const sellerId = sellerProfile.id;

        // सेलर के सभी ऑर्डर्स को फ़ेच करें
        const sellerOrders = await db.query.orders.findMany({
            where: exists(
                db.select().from(orderItems).where(
                    and(
                        eq(orderItems.sellerId, sellerId),
                        eq(orderItems.orderId, orders.id)
                    )
                )
            ),
            with: {
                customer: true,
                items: {
                    with: {
                        product: true
                    }
                }
            },
            orderBy: desc(orders.createdAt),
        });

        return res.status(200).json(sellerOrders);
    } catch (error: any) {
        console.error('❌ Error in GET /api/sellers/orders:', error);
        return res.status(500).json({ error: 'Failed to fetch seller orders.' });
    }
});

/**
 * ✅ GET /api/sellers/products (केवल वर्तमान सेलर के प्रोडक्ट फ़ेच करें)
 */
sellerRouter.get('/products', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
        if (!sellerProfile) {
            return res.status(404).json({ error: 'Seller profile not found.' });
        }
        const sellerId = sellerProfile.id;

        const sellerProducts = await db.query.products.findMany({
            where: eq(products.sellerId, sellerId),
            with: {
                category: true,
            },
            orderBy: desc(products.createdAt),
        });

        return res.status(200).json(sellerProducts);
    } catch (error: any) {
        console.error('❌ Error in GET /api/sellers/products:', error);
        return res.status(500).json({ error: 'Failed to fetch seller products.' });
    }
});

/**
 * ✅ GET /api/sellers/categories (केवल वर्तमान सेलर की कैटेगरी फ़ेच करें)
 */
sellerRouter.get('/categories', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
        if (!sellerProfile) {
            return res.status(404).json({ error: 'Seller profile not found.' });
        }
        const sellerId = sellerProfile.id;

        const sellerCategories = await db.query.categories.findMany({
            where: eq(categories.sellerId, sellerId),
            orderBy: desc(categories.createdAt),
        });

        return res.status(200).json(sellerCategories);
    } catch (error: any) {
        console.error('❌ Error in GET /api/sellers/categories:', error);
        return res.status(500).json({ error: 'Failed to fetch seller categories.' });
    }
});

/**
 * ✅ PATCH /api/sellers/orders/:orderId/status (ऑर्डर की स्थिति अपडेट करें)
 */
sellerRouter.patch('/orders/:orderId/status', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const validStatus = orderStatusEnum.enumValues;
    if (!validStatus.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid order status provided.' });
    }

    const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
    if (!sellerProfile) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }
    const sellerId = sellerProfile.id;

    // 1. ऑर्डर को उसके ID और sellerId के साथ फ़ेच करें
    const orderToUpdate = await db.query.orders.findFirst({
        where: eq(orders.id, parseInt(orderId)),
        with: {
            items: {
                where: eq(orderItems.sellerId, sellerId),
            }
        }
    });

    if (!orderToUpdate || orderToUpdate.items.length === 0) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to update this order.' });
    }

    // 2. स्थिति अपडेट करने के लिए लॉजिक
    // सुनिश्चित करें कि केवल सही स्थितियाँ ही अपडेट हो सकें।
    if (orderToUpdate.status === 'placed' && newStatus === 'accepted') {
        // 'placed' से 'accepted' में बदलाव
    } else if (orderToUpdate.status === 'placed' && newStatus === 'rejected') {
        // 'placed' से 'rejected' में बदलाव
    } else if (orderToUpdate.status === 'accepted' && newStatus === 'out_for_delivery') {
        // 'accepted' से 'out_for_delivery' में बदलाव
    } else if (orderToUpdate.status === 'out_for_delivery' && newStatus === 'delivered') {
        // 'out_for_delivery' से 'delivered' में बदलाव
    } else {
        return res.status(400).json({ error: 'Invalid status transition.' });
    }
    
    // 3. डेटाबेस में स्थिति अपडेट करें
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, parseInt(orderId)))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.status(200).json(updatedOrder);
  } catch (error: any) {
    console.error('❌ Error in PATCH /api/sellers/orders/:orderId/status:', error);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

/**
 * ✅ POST /api/sellers/apply
 */
sellerRouter.post("/apply", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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
  } catch (error: any) {
    console.error("❌ Error in POST /api/sellers:", error);
    next(error);
  }
});

/**
 * ✅ POST /api/sellers/products
 */
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

      const [dbUser] = await db.select()
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid));

      if (!dbUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const [sellerProfile] = await db
        .select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.userId, dbUser.id));

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

export default sellerRouter;
  
