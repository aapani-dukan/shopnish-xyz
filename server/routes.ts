// server/routes.ts

import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { eq, like } from 'drizzle-orm';
import {
  users,
  sellersPgTable,
  products,
  categories,
  deliveryBoys,
  userRoleEnum,
  approvalStatusEnum,
  insertProductSchema,
} from '@/shared/backend/schema';
import { AuthenticatedRequest } from '@/shared/types/auth';

import { requireAuth, requireAdminAuth, requireSellerAuth } from './middleware/authMiddleware.js';

import apiAuthLoginRouter from './roots/apiAuthLogin.js';
import apiAuthLogoutRouter from './roots/apiAuthLogout.js';

import adminApproveProductRoutes from './roots/admin/approve-product.js';
import adminRejectProductRoutes from './roots/admin/reject-product.js';
import adminProductsRoutes from './roots/admin/products.js';
import adminVendorsRoutes from './roots/admin/vendors.js';
import adminPasswordRoutes from './roots/admin/admin-password.js';


const router = Router(); // यह आपका मुख्य /api राउटर है

// --- Test Route ---
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running' });
});

// --- User Registration ---
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    if (!userData.firebaseUid || !userData.email) {
      return res.status(400).json({ error: 'Firebase UID and email are required for registration.' });
    }

    const [newUser] = await db.insert(users).values({
      uuid: userData.firebaseUid,
      email: userData.email,
      name: userData.name || null,
      role: userRoleEnum.enumValues[0], // Default to customer
      approvalStatus: approvalStatusEnum.enumValues[1], // Default to approved
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      address: userData.address,
      city: userData.city,
      pincode: userData.pincode,
    }).returning();
    
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('User registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Authentication Routes ---
// apiAuthLoginRouter को /auth पाथ के तहत माउंट करें। यह /api/auth/login को हैंडल करेगा।
router.use('/auth', apiAuthLoginRouter);


// --- User Profile (Authentication Required) ---
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uuid) {
      return res.status(401).json({ error: 'User not authenticated or UUID missing.' });
    }
    const [user] = await db.select().from(users).where(eq(users.uuid, req.user.uuid));
    if (!user) {
      return res.status(404).json({ error: 'User not found in database.' });
    }
    res.status(200).json({
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      role: user.role,
      seller: user.role === 'seller' ? { approvalStatus: user.approvalStatus } : undefined,
    });
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- User Logout (Firebase Session Cookie) ---
router.post('/auth/logout', async (req, res) => {
  const sessionCookie = req.cookies?.__session || '';

  res.clearCookie('__session');

  try {
    if (sessionCookie) {
      const admin = await import('firebase-admin'); 
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
      await admin.auth().revokeRefreshTokens(decodedClaims.sub);
    }
    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error: any) {
    console.error('Error revoking session:', error);
    res.status(500).json({ message: 'Logout failed.' });
  }
});

// --- Seller Routes ---
router.post('/sellers/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid; 

    if (!userUuid) {
      return res.status(401).json({ error: 'User not authenticated or UUID missing.' });
    }

    const [dbUser] = await db.select({ id: users.id, role: users.role, approvalStatus: users.approvalStatus })
                               .from(users).where(eq(users.uuid, userUuid));

    if (!dbUser) {
        return res.status(404).json({ error: 'User not found in database for application.' });
    }

    const [existingSeller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (existingSeller) {
      return res.status(409).json({ error: 'Seller application already exists for this user.' });
    }

    const sellerData = {
      ...req.body,
      userId: dbUser.id,
      approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
    };

    const [newSeller] = await db.insert(sellersPgTable).values(sellerData).returning();

    await db.update(users).set({ 
      role: userRoleEnum.enumValues[1], // 'seller'
      approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
    }).where(eq(users.id, dbUser.id));

    res.status(201).json(newSeller);
  } catch (error: any) {
    console.error('Seller application failed:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/seller/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) {
      return res.status(401).json({ error: 'User not authenticated or UUID missing.' });
    }

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uuid, userUuid));
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database for seller profile.' });
    }

    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }
    res.status(200).json(seller);
  } catch (error: any) {
    console.error('Failed to fetch seller profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Categories Routes ---
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.select().from(categories);
    res.status(200).json(categoriesList);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Products Routes (General) ---
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query;
    let query = db.select().from(products);

    if (categoryId) {
      query = query.where(eq(products.categoryId, parseInt(categoryId as string)));
    }
    if (search) {
      query = query.where(like(products.name, `%${search}%`));
    }

    const productsList = await query;
    res.status(200).json(productsList);
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.status(200).json(product);
  } catch (error: any) {
    console.error('Failed to fetch product:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Seller Products Routes ---
router.post('/seller/products', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid; 
    if (!userUuid) {
      return res.status(401).json({ error: 'Unauthorized: User UUID missing.' });
    }

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uuid, userUuid));
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found for this user.' });
    }

    const productData = {
      ...req.body,
      sellerId: seller.id,
      storeId: req.body.storeId,
      categoryId: req.body.categoryId || (await db.select().from(categories).limit(1))[0].id,
    };

    const [newProduct] = await db.insert(products).values(productData).returning();
    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error('Failed to add product:', error);
    res.status(400).json({ error: error.message });
  }
});

// --- Delivery Boy Routes ---
router.post('/delivery-boys/register', async (req: Request, res: Response) => {
  try {
    const { email, firebaseUid, name, vehicleType } = req.body;
    
    const [newDeliveryBoy] = await db.insert(deliveryBoys).values({
      uuid: firebaseUid,
      email: email,
      name: name || 'Delivery Boy',
      vehicleType: vehicleType,
      approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
    }).returning();
    
    res.status(201).json(newDeliveryBoy);

  } catch (error: any) {
    console.error('Delivery boy registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// Admin Routes
// यह एडमिन-विशिष्ट रूट्स के लिए एक समर्पित सब-राउटर है।
// हमने adminRouter.use(requireAdminAuth); का उपयोग करके सभी एडमिन रूट्स पर requireAdminAuth मिडलवेयर लागू कर दिया है।
const adminRouter = Router();
adminRouter.use(requireAdminAuth); // सभी एडमिन रूट्स पर requireAdminAuth लागू करें

// adminRouter में एडमिन-विशिष्ट रूट्स जोड़ें
// ये रूट्स /api/admin/* के तहत एक्सेस किए जाएंगे
adminRouter.use('/products/approve', adminApproveProductRoutes);
adminRouter.use('/products/reject', adminRejectProductRoutes);
adminRouter.use('/products', adminProductsRoutes); // यह /api/admin/products को हैंडल करेगा
adminRouter.use('/vendors', adminVendorsRoutes);   // यह /api/admin/vendors को हैंडल करेगा
adminRouter.use('/password', adminPasswordRoutes); // यह /api/admin/password को हैंडल करेगा

// एडमिन रूट: विक्रेताओं को देखना
adminRouter.get('/sellers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await db.select().from(sellersPgTable).where(eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[0]));
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error('Failed to fetch pending sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// एडमिन रूट: विक्रेता को स्वीकार करना
adminRouter.post('/sellers/:sellerId/approve', async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  if (isNaN(sellerId)) {
    return res.status(400).json({ error: 'Invalid seller ID.' });
  }

  try {
    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.id, sellerId));
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found.' });
    }

    await db.update(sellersPgTable).set({ 
      approvalStatus: approvalStatusEnum.enumValues[1], // 'approved'
      approvedAt: new Date() 
    }).where(eq(sellersPgTable.id, sellerId));

    await db.update(users).set({ 
      role: userRoleEnum.enumValues[1], // 'seller'
      approvalStatus: approvalStatusEnum.enumValues[1], // 'approved'
    }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller approved successfully.' });
  } catch (error: any) {
    console.error('Failed to approve seller:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// एडमिन रूट: विक्रेता को अस्वीकार करना
adminRouter.post('/sellers/:sellerId/reject', async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  const { reason } = req.body;
  if (isNaN(sellerId)) {
    return res.status(400).json({ error: 'Invalid seller ID.' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  try {
    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.id, sellerId));
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found.' });
    }

    await db.update(sellersPgTable).set({ 
      approvalStatus: approvalStatusEnum.enumValues[2], // 'rejected'
      rejectionReason: reason 
    }).where(eq(sellersPgTable.id, sellerId));

    await db.update(users).set({ approvalStatus: approvalStatusEnum.enumValues[2] }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller rejected successfully.' });
  } catch (error: any) {
    console.error('Failed to reject seller:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- मुख्य राउटर में सभी प्रमुख सेक्शन्स को माउंट करें ---
router.use('/admin', adminRouter); // `/api/admin/*` को हैंडल करेगा


// --- registerRoutes फ़ंक्शन ---
// यह फ़ंक्शन server/index.ts में उपयोग किया जाएगा
export function registerRoutes(app: express.Express) {
  app.use("/api", router); 
  app.use('/api/auth', apiAuthLogoutRouter);
  app.use('/api/auth',apiAuthLoginRouter);
  // आपका मुख्य `/api` राउटर यहाँ जोड़ा गया है
  }
