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

// ✅ अब orderRoutes को io ऑब्जेक्ट पास किया जाएगा
import orderRoutes from '../routes/orderRoutes';

// ✅ Sub-route modules को इंपोर्ट करें
import apiAuthLoginRouter from './roots/apiAuthLogin.ts';
import adminApproveProductRoutes from './roots/admin/approve-product.ts';
import adminRejectProductRoutes from './roots/admin/reject-product.ts';
import adminProductsRoutes from './roots/admin/products.ts';
import adminVendorsRoutes from './roots/admin/vendors.ts';
import adminPasswordRoutes from './roots/admin/admin-password.ts';
import sellerRouter from '../routes/sellers/sellerRoutes.ts';
import productsRouter from '../routes/productRoutes.ts';
import cartRouter from '../routes/cartRoutes.ts';
import dBoyRouter from '../routes/dboyRoutes.ts';
import admindBoyRouter from './roots/admin/admindBoyRoutes.ts
import orderConfirmationRouter from '../routes/orderConfirmationRouter';
import { orderdBoyRouter } from './roots/admin/orderdBoyRoutes.ts';
import { verifyToken } from "./middleware/verifyToken"; 
const router = Router();
let ioInstance: any; // ✅ io इंस्टेंस को होल्ड करने के लिए एक वेरिएबल

// ✅ io को सेट करने के लिए एक फ़ंक्शन
export function setIo(io: any) {
  ioInstance = io;
  // ✅ ऑर्डर रूट्स को io इंस्टेंस पास करें
  orderRoutes.setIo(ioInstance);
}

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

// ✅ Auth Routes
router.use('/auth', apiAuthLoginRouter);

// ✅ User Profile
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

// ✅ Seller-specific routes

//cartRourer
router.use('/cart', cartRouter);
//orderRouter
router.use('/orders', orderRoutes);
//orderConfirmationRouter
router.use('/order-confirmation', orderConfirmationRouter);
router.use("/sellers", verifyToken, sellerRouter);

// ✅ Categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.select().from(categories);
    res.status(200).json(categoriesList);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// ✅ Products
// GET /api/products
router.use('/products', productsRouter);

// ✅ Delivery Boy

router.use('/api/delivery-boys', dBoyRouter);

// Admin Routes

const adminRouter = Router();
adminRouter.use(requireAdminAuth); // ✅ सभी एडमिन राउट्स के लिए ऑथेंटिकेशन
adminRouter.use('/products/approve', adminApproveProductRoutes);
adminRouter.use('/products/reject', adminRejectProductRoutes);
adminRouter.use('/products', adminProductsRoutes);
adminRouter.use('/password', adminPasswordRoutes);
adminRouter.use('/vendors', adminVendorsRoutes);
adminRouter.use('/delivery-boys', adminDBoyRouter);
adminRouter.use('/orders', orderdBoyRouter);
router.use('/admin', adminRouter);

export default router;
