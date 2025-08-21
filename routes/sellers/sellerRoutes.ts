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
  orderItems
} from '../../shared/backend/schema';
import { requireSellerAuth } from '../../server/middleware/authMiddleware';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken';
import { eq, desc, and } from 'drizzle-orm';
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage'; 
import { orderStatusEnum } from '../../shared/backend/schema'; // ✅ नया आयात (import)

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

// ✅ GET /api/sellers/me
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


// ✅ GET /api/sellers/orders (विक्रेता के लिए ऑर्डर्स फ़ेच करें)
sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    if (!dbUser) {
        return res.status(404).json({ error: 'User not found.' });
    }

    const [sellerProfile] = await db.select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.userId, dbUser.id));

    if (!sellerProfile) {
        return res.status(404).json({ error: 'Seller profile not found.' });
    }
    const sellerId = sellerProfile.id;

    console.log('✅ /sellers/orders: Received request for sellerId:', sellerId);

    const orderItemsForSeller = await db.query.orderItems.findMany({
        where: eq(orderItems.sellerId, sellerId),
        with: {
            order: {
                with: {
                    customer: true,
                    deliveryBoy: true,
                    tracking: true,
                }
            },
            product: true,
        },
        orderBy: [desc(orderItems.createdAt)],
    });

    const groupedOrders: any = {};
    orderItemsForSeller.forEach(item => {
      const orderId = item.order.id;
      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          ...item.order,
          items: [],
        };
      }
      groupedOrders[orderId].items.push({
        ...item,
        order: undefined,
      });
    });

    const ordersWithItems = Object.values(groupedOrders);
    
    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', ordersWithItems.length);
    return res.status(200).json(ordersWithItems);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    console.error(error); 
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});


// ✅ PATCH /api/sellers/orders/:orderId/status (ऑर्डर की स्थिति अपडेट करें)
sellerRouter.patch('/orders/:orderId/status', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // सुनिश्चित करें कि नई स्थिति (status) मान्य है
    const validStatus = orderStatusEnum.enumValues;
    if (!validStatus.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid order status provided.' });
    }

    // विक्रेता की प्रोफ़ाइल की जाँच करें
    const [sellerProfile] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
    if (!sellerProfile) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    // ऑर्डर की जाँच करें
    const [orderToUpdate] = await db.select().from(orders).where(eq(orders.id, parseInt(orderId)));
    if (!orderToUpdate) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // केवल तभी अपडेट करें जब विक्रेता इस ऑर्डर से जुड़ा हो
    const isSellerInvolved = await db.select().from(orderItems)
      .where(and(eq(orderItems.orderId, parseInt(orderId)), eq(orderItems.sellerId, sellerProfile.id)))
      .limit(1);

    if (isSellerInvolved.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to update this order.' });
    }

    // ऑर्डर की स्थिति को अपडेट करें
    const [updatedOrder] = await db.update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, parseInt(orderId)))
      .returning();

    return res.status(200).json(updatedOrder);

  } catch (error: any) {
    console.error('❌ Error in PATCH /api/sellers/orders/:orderId/status:', error);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});


// ✅ POST /api/sellers/apply (Apply as a seller)
sellerRouter.post("/apply", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Received seller apply data:', req.body);
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) return res.status(401).json({ message: "Unauthorized" });

    const {
      businessName, businessAddress, businessPhone, description, city, pincode,
      gstNumber, bankAccountNumber, ifscCode, deliveryRadius, businessType,
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
        approvalStatus: approvalStatusEnum.enumValues[0],
        applicationDate: new Date(),
      })
      .returning();

    const [updatedUser] = await db
      .update(users)
      .set({
        role: userRoleEnum.enumValues[1],
        approvalStatus: approvalStatusEnum.enumValues[0],
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


// ✅ POST /api/sellers/categories
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
      
      const [dbUser] = await db.select()
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid));

      if (!dbUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const [sellerProfile] = await db.select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.userId, dbUser.id));

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


// ✅ POST /api/sellers/products
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
