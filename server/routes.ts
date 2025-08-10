// server/routes.ts

import express, { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { eq, like } from 'drizzle-orm';
import {
  users,
  products,
  categories,
  deliveryBoys,
  userRoleEnum,
  approvalStatusEnum,
  sellersPgTable,
} from '../shared/backend/schema.ts';

import { AuthenticatedRequest } from './middleware/verifyToken.ts';
import { requireAuth, requireAdminAuth } from './middleware/authMiddleware.ts';
import { authAdmin } from './lib/firebaseAdmin.ts';

// Sub-route modules
import apiAuthLoginRouter from './roots/apiAuthLogin.ts';
import adminApproveProductRoutes from './roots/admin/approve-product.ts';
import adminRejectProductRoutes from './roots/admin/reject-product.ts';
import adminProductsRoutes from './roots/admin/products.ts';
import adminVendorsRoutes from './roots/admin/vendors.ts';
import adminPasswordRoutes from './roots/admin/admin-password.ts';
import sellerRouter from '../routes/sellers/sellerRoutes.ts';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running' });
});

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    if (!userData.firebaseUid || !userData.email) {
      return res.status(400).json({ error: 'Firebase UID and email are required.' });
    }

    const [newUser] = await db.insert(users).values({
      firebaseUid: userData.firebaseUid,
      email: userData.email,
      name: userData.name || null,
      role: userRoleEnum.enumValues[0],
      approvalStatus: approvalStatusEnum.enumValues[1],
      password: userData.password || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      address: userData.address || '',
      city: userData.city || '',
      pincode: userData.pincode || '',
    }).returning();

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('User registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});

router.use('/auth', apiAuthLoginRouter);

// ✅ यहाँ बदलाव किया गया है
router.get('/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.firebaseUid;
    if (!userUuid) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const [user] = await db.select().from(users).where(eq(users.firebaseUid, userUuid));
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let sellerInfo;
    if (user.role === 'seller') {
      const [record] = await db.select({
        id: sellersPgTable.id,
        userId: sellersPgTable.userId,
        businessName: sellersPgTable.businessName,
        approvalStatus: sellersPgTable.approvalStatus,
        rejectionReason: sellersPgTable.rejectionReason
      }).from(sellersPgTable).where(eq(sellersPgTable.userId, user.id));
      if (record) sellerInfo = record;
    }

    // ✅ यहाँ रिस्पॉन्स ऑब्जेक्ट में बदलाव किया गया है।
    // हम उपयोगकर्ता के सभी डेटा के साथ-साथ `sellerInfo` भी भेज रहे हैं।
    res.status(200).json({ ...user, sellerProfile: sellerInfo || null });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

router.post('/auth/logout', async (req, res) => {
  const sessionCookie = req.cookies?.__session || '';
  res.clearCookie('__session');

  try {
    if (sessionCookie) {
      const decoded = await authAdmin.auth().verifySessionCookie(sessionCookie);
      await authAdmin.auth().revokeRefreshTokens(decoded.sub);
    }
    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Logout failed.' });
  }
});

router.use('/sellers', sellerRouter);

// Categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.select().from(categories);
    res.status(200).json(categoriesList);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// Products
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
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

  try {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(product);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// Delivery Boy
router.post('/delivery-boys/register', async (req: Request, res: Response) => {
  try {
    const { email, firebaseUid, name, vehicleType } = req.body;

    const [newDeliveryBoy] = await db.insert(deliveryBoys).values({
      firebaseUid: firebaseUid,
      email,
      name: name || 'Delivery Boy',
      vehicleType,
      approvalStatus: approvalStatusEnum.enumValues[0],
    }).returning();

    res.status(201).json(newDeliveryBoy);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Admin Routes
const adminRouter = Router();
adminRouter.use(requireAdminAuth);

adminRouter.use('/products/approve', adminApproveProductRoutes);
adminRouter.use('/products/reject', adminRejectProductRoutes);
adminRouter.use('/products', adminProductsRoutes);
adminRouter.use('/vendors', adminVendorsRoutes);
adminRouter.use('/password', adminPasswordRoutes);

// Admin Seller Actions
adminRouter.get('/sellers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await db.select().from(sellersPgTable).where(eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[0]));
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

adminRouter.post('/sellers/:sellerId/approve', async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  if (isNaN(sellerId)) return res.status(400).json({ error: 'Invalid seller ID.' });

  try {
    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.id, sellerId));
    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    await db.update(sellersPgTable).set({ approvalStatus: approvalStatusEnum.enumValues[1], approvedAt: new Date() }).where(eq(sellersPgTable.id, sellerId));
    await db.update(users).set({ role: userRoleEnum.enumValues[1], approvalStatus: approvalStatusEnum.enumValues[1] }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller approved successfully.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

adminRouter.post('/sellers/:sellerId/reject', async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  const { reason } = req.body;

  if (isNaN(sellerId)) return res.status(400).json({ error: 'Invalid seller ID.' });
  if (!reason) return res.status(400).json({ error: 'Rejection reason required.' });

  try {
    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.id, sellerId));
    if (!seller) return res.status(404).json({ error: 'Seller not found.' });

    await db.update(sellersPgTable).set({ approvalStatus: approvalStatusEnum.enumValues[2], rejectionReason: reason }).where(eq(sellersPgTable.id, sellerId));
    await db.update(users).set({ approvalStatus: approvalStatusEnum.enumValues[2] }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller rejected successfully.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

router.use('/admin', adminRouter);

export default router;

