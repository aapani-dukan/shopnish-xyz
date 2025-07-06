// server/routes.ts

import { Request, Response, Router, NextFunction } from 'express';
import { db } from './db.js';
import { and, eq, like, isNotNull } from 'drizzle-orm';
import {
  users,
  sellersPgTable,
  products,
  categories,
  deliveryBoys,
  orders,
  cartItems,
  orderItems,
  reviews,
  userRoleEnum,
  approvalStatusEnum,
  insertUserSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertSellerSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertDeliveryBoySchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertProductSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertOrderSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertOrderItemSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertReviewSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
  insertCartItemSchema, // केवल अगर आप इसे यहाँ सीधे उपयोग कर रहे हैं
} from '@/shared/backend/schema';
import { AuthenticatedRequest, AuthenticatedUser } from '@/shared/types/auth';
// storage.js का इम्पोर्ट तभी रखें जब आप इसे सीधे इस फ़ाइल में उपयोग कर रहे हों
// import { storage } from './storage.js';

// मिडलवेयर इम्पोर्ट्स - पाथ सुनिश्चित करें
import { requireAuth, requireAdminAuth, requireSellerAuth, requireDeliveryBoyAuth } from './middleware/authMiddleware.js';

// रूट्स फ़ाइलें इम्पोर्ट करें - पाथ सुनिश्चित करें कि वे आपके `server/roots` फ़ोल्डर के अनुरूप हों
import apiAuthLoginRouter from './roots/apiAuthLogin.js'; // आपका नया auth लॉगिन राउटर
import adminApproveProductRoutes from './roots/admin/approve-product.js';
import adminRejectProductRoutes from './roots/admin/reject-product.js';
import adminProductsRoutes from './roots/admin/products.js';
import adminVendorsRoutes from './roots/admin/vendors.js';
import adminPasswordRoutes from './roots/admin/admin-password.js';

// Firebase Admin SDK (यह आमतौर पर server/index.ts में इनिशियलाइज़ होता है)
// यह इम्पोर्ट केवल तभी रखें जब आप authAdmin को सीधे इस फ़ाइल में उपयोग कर रहे हों
// आपके `/auth/login` लॉजिक को apiAuthLogin.ts में ले जाया गया है, इसलिए इसकी यहां आवश्यकता नहीं है
// import { authAdmin } from './lib/firebaseAdmin.js';


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
      approvalStatus: approvalStatusEnum.enumValues[1], // Default to approved (या 'pending' अगर आप मैनुअल अप्रूवल चाहते हैं)
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

// ✅ Authentication Routes (apiAuthLogin.ts से इम्पोर्ट किया गया है)
// यह `/api/auth/login` को हैंडल करेगा
router.use('/auth', apiAuthLoginRouter);

// --- User Profile (requires authentication) ---
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
      // Firebase Admin SDK (authAdmin) को server/index.ts में इनिशियलाइज़ किया गया है
      // और इसे यहां सीधे उपयोग नहीं किया जा सकता, जब तक कि आप इसे यहां इम्पोर्ट न करें
      // या एक मिडलवेयर के माध्यम से उपलब्ध न कराएं।
      // यदि आप authAdmin को यहां उपयोग करना चाहते हैं, तो 'import { authAdmin } from './lib/firebaseAdmin.js';' को अनकमेंट करें
      // और सुनिश्चित करें कि authAdmin वास्तव में Firebase Admin SDK का इंस्टेंस है।
      // उदाहरण के लिए, आप इसे एक मिडलवेयर के माध्यम से req पर जोड़ सकते हैं।
      
      // यदि authAdmin इम्पोर्टेड है:
      // const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie);
      // await authAdmin.revokeRefreshTokens(decodedClaims.sub);
      
      // वैकल्पिक रूप से, यदि आप authAdmin इम्पोर्ट नहीं करना चाहते हैं, तो यह सीधे admin.auth() का उपयोग करेगा (जो init हो चुका होगा)
      // यह मानते हुए कि Firebase Admin SDK (admin) init हो चुका है और वैश्विक स्तर पर उपलब्ध है या req पर जोड़ा गया है।
      // या, आप logout लॉजिक को एक अलग फ़ाइल में ले जा सकते हैं और वहां authAdmin को इम्पोर्ट कर सकते हैं।
      // फिलहाल, इसे ऐसे ही छोड़ रहा हूं, लेकिन जान लें कि `authAdmin` को यहां उपलब्ध होना चाहिए।
      console.warn("Logout: Firebase Admin SDK directly used here, ensure 'authAdmin' is properly available or imported.");
      const admin = await import('firebase-admin'); // यहां डायनेमिक इम्पोर्ट का एक उदाहरण
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
    const userUuid = req.user?.uuid; // Assuming req.user.uuid is the user's UUID
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
      storeId: req.body.storeId, // Ensure storeId is passed in the body
      categoryId: req.body.categoryId || (await db.select().from(categories).limit(1))[0].id, // Default category
    };

    // If you are using Zod for validation, uncomment the next line
    // const parsedProductData = insertProductSchema.parse(productData);

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
    // Assuming insertDeliveryBoySchema.parse(req.body) would be used if doing Zod validation here
    // And approvalStatus is set to 'pending' by default.
    // Ensure all required fields for deliveryBoys table are provided in req.body.
    
    // Example: Minimal insertion for demonstration
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

// --- Admin Routes ---
// एडमिन रूट्स के लिए एक समर्पित सब-राउटर
const adminRouter = Router();
adminRouter.use(requireAdminAuth); // सभी एडमिन रूट्स पर requireAdminAuth लागू करें

// adminRouter में एडमिन-विशिष्ट रूट्स जोड़ें
adminRouter.use('/products/approve', adminApproveProductRoutes);
adminRouter.use('/products/reject', adminRejectProductRoutes);
adminRouter.use('/products', adminProductsRoutes);
adminRouter.use('/vendors', adminVendorsRoutes);
adminRouter.use('/password', adminPasswordRoutes);

// एडमिन रूट: विक्रेताओं को देखना (अगर यह एक अलग राउटर नहीं है)
adminRouter.get('/sellers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await db.select().from(sellersPgTable).where(eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[0]));
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error('Failed to fetch pending sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// एडमिन रूट: विक्रेता को स्वीकार करना (अगर यह एक अलग राउटर नहीं है)
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

// एडमिन रूट: विक्रेता को अस्वीकार करना (अगर यह एक अलग राउटर नहीं है)
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
export function registerRoutes(app: express.Express) { // 'express.Express' टाइप का उपयोग करें
  app.use("/api", router); // आपका मुख्य `/api` राउटर यहाँ जोड़ा गया है
}

               
