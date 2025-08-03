// server/routes.ts

import { Express } from 'express';
import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { eq, like } from 'drizzle-orm';
import {
  users,
  sellersPgTable,
  products,
  categories,
  deliveryBoys,
  userRoleEnum,
  approvalStatusEnum,
  // insertProductSchema, // यह इम्पोर्ट कहीं उपयोग नहीं किया गया है, इसे हटाया जा सकता है यदि आवश्यक न हो
} from '../shared/backend/schema.ts';
import { AuthenticatedRequest } from '../shared/types/auth.ts'; // सुनिश्चित करें कि यह AuthenticatedRequest का सही स्रोत है

import { requireAuth, requireAdminAuth, requireSellerAuth } from './middleware/authMiddleware.ts';
import { authAdmin } from './lib/firebaseAdmin.ts'; // Firebase Admin SDK को logout के लिए इम्पोर्ट करें

// राउटर्स जो इस फ़ाइल में सीधे परिभाषित नहीं हैं
import apiAuthLoginRouter from './roots/apiAuthLogin.ts'; // यह /api/auth को हैंडल करता है

import adminApproveProductRoutes from './roots/admin/approve-product.ts';
import adminRejectProductRoutes from './roots/admin/reject-product.ts';
import adminProductsRoutes from './roots/admin/products.ts';
import adminVendorsRoutes from './roots/admin/vendors.ts';
import adminPasswordRoutes from './roots/admin/admin-password.ts';

import sellerRoutes from '../routes/sellers/apply'; // ✅ Import करो



const router = Router(); // यह आपका मुख्य /api राउटर है, जो server/index.ts में /api के तहत माउंट किया जाएगा

// --- Test Route ---
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running' });
});

// --- Health Check Route ---
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
// यह एंडपॉइंट /api/me पर उपयोगकर्ता का सामान्य प्रोफ़ाइल लौटाता है।
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uuid) {
      return res.status(401).json({ error: 'User not authenticated or UUID missing.' });
    }
    const [user] = await db.select().from(users).where(eq(users.uuid, req.user.uuid));
    if (!user) {
      return res.status(404).json({ error: 'User not found in database.' });
    }
    // विक्रेता की स्थिति को शामिल करें यदि उपयोगकर्ता विक्रेता है
    let sellerInfo = undefined;
    if (user.role === 'seller') {
        const [sellerRecord] = await db.select({ approvalStatus: sellersPgTable.approvalStatus }).from(sellersPgTable).where(eq(sellersPgTable.userId, user.id));
        if (sellerRecord) {
            sellerInfo = { approvalStatus: sellerRecord.approvalStatus };
        }
    }

    res.status(200).json({
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      role: user.role,
      seller: sellerInfo, // अब विक्रेता की जानकारी शामिल है
    });
  } catch (error: any) {
    console.error('Failed to fetch user profile (api/me):', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- User Logout (Firebase Session Cookie) ---
router.post('/auth/logout', async (req, res) => {
  const sessionCookie = req.cookies?.__session || '';

  res.clearCookie('__session');

  try {
    if (sessionCookie) {
      // authAdmin सीधे उपयोग करें, इम्पोर्ट('firebase-admin') की आवश्यकता नहीं है
      const decodedClaims = await authAdmin.auth().verifySessionCookie(sessionCookie);
      await authAdmin.auth().revokeRefreshTokens(decodedClaims.sub);
    }
    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error: any) {
    console.error('Error revoking session:', error);
    res.status(500).json({ message: 'Logout failed.' });
  }
});



router.post('/sellers/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // ✅ यहाँ लॉग जोड़ें
  console.log('--- POST /sellers/apply request received ---');
  console.log('Request Body:', req.body); // देखें कि रिक्वेस्ट बॉडी क्या है
  
  try {
    const userUuid = req.user?.uuid; 

    if (!userUuid) {
      console.log('Error: User not authenticated or UUID missing.');
      return res.status(401).json({ error: 'User not authenticated or UUID missing.' });
    }
    console.log('Authenticated user UUID:', userUuid);

    const [dbUser] = await db.select({ id: users.id, role: users.role, approvalStatus: users.approvalStatus })
                               .from(users).where(eq(users.uuid, userUuid));

    if (!dbUser) {
        console.log('Error: User not found in database for application.');
        return res.status(404).json({ error: 'User not found in database for application.' });
    }
    console.log('DB User found:', dbUser.id, dbUser.role);

    const [existingSeller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (existingSeller) {
      console.log('Existing seller application found:', existingSeller.approvalStatus);
      let message = 'Seller application already exists for this user.';
      let statusCode = 409; // Conflict

      if (existingSeller.approvalStatus === approvalStatusEnum.enumValues[0]) { // 'pending'
          message = 'You have already submitted your seller application. It is currently pending review.';
          statusCode = 200;
      } else if (existingSeller.approvalStatus === approvalStatusEnum.enumValues[1]) { // 'approved'
          message = 'You are already an approved seller.';
          statusCode = 200;
      } else if (existingSeller.approvalStatus === approvalStatusEnum.enumValues[2]) { // 'rejected'
          message = 'Your previous seller application was rejected. Please contact support for re-application.';
          statusCode = 200;
      }
      // ✅ यहाँ लॉग जोड़ें
      console.log('Sending existing seller response:', { message: message, sellerProfile: existingSeller });
      return res.status(statusCode).json({ message: message, sellerProfile: existingSeller });
    }
    console.log('No existing seller application found, proceeding with new application.');

    const sellerData = {
      ...req.body,
      userId: dbUser.id,
      approvalStatus: approvalStatusEnum.enumValues[0], // 'pending'
      applicationDate: new Date(),
    };
    console.log('Seller data to insert:', sellerData);

    const [newSeller] = await db.insert(sellersPgTable).values(sellerData).returning();
    console.log("Seller data inserted into DB:", newSeller);

    await db.update(users).set({ 
      role: userRoleEnum.enumValues[1],
      approvalStatus: approvalStatusEnum.enumValues[0],
    }).where(eq(users.id, dbUser.id));
    console.log("User role updated successfully.");

    // ✅ यहाँ लॉग जोड़ें
    console.log("Sending successful new seller application response:", {
        message: 'Seller application submitted successfully! It is pending review.',
        sellerProfile: newSeller
    });

    res.status(201).json({
        message: 'Seller application submitted successfully! It is pending review.',
        sellerProfile: newSeller
    });
  } catch (error: any) {
    console.error('Seller application failed with error:', error);
    // ✅ यहाँ लॉग जोड़ें
    console.log('Sending error response for seller application:', error.message);
    res.status(500).json({ error: 'Internal server error during seller application.' });
  }
});



// GET /api/seller/me (केवल विक्रेताओं के लिए)
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
      // ✅ महत्वपूर्ण बदलाव: 404 Not Found के साथ एक स्पष्ट JSON एरर रिस्पॉन्स भेजें।
      // यह क्लाइंट-साइड apiRequest के 404 हैंडलिंग के साथ सही ढंग से संरेखित होता है।
      return res.status(404).json({ message: 'Seller profile not found for this user.' });
    }

    // विक्रेता मिलने पर 200 OK के साथ विक्रेता डेटा भेजें
    res.status(200).json(seller);
  } catch (error: any) {
    console.error('Failed to fetch seller profile (api/seller/me):', error);
    // सुनिश्चित करें कि आप हमेशा एक JSON एरर रिस्पॉन्स भेजते हैं
    res.status(500).json({ error: 'Internal server error fetching seller profile.' });
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
  return res.status(404).json({ message: 'Seller profile not found for this user.' });
}

      

    const productData = {
      ...req.body,
      sellerId: seller.id,
      storeId: req.body.storeId,
      categoryId: req.body.categoryId || (await db.select().from(categories).limit(1))[0].id,
    };

    // यहां आप insertProductSchema का उपयोग करके productData को वैलिडेट कर सकते हैं
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
const adminRouter = Router();
adminRouter.use(requireAdminAuth); // एडमिन राउट्स के लिए एडमिन प्रमाणीकरण लागू करें

adminRouter.use('/products/approve', adminApproveProductRoutes);
adminRouter.use('/products/reject', adminRejectProductRoutes);
adminRouter.use('/products', adminProductsRoutes); 
adminRouter.use('/vendors', adminVendorsRoutes);   
adminRouter.use('/password', adminPasswordRoutes); 

// एडमिन रूट: विक्रेताओं को देखना (लंबित)
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


export function registerRoutes(app: Express) {
  app.use('/api/sellers', sellerRoutes);
  //app.use('/api/admin', adminRoutes);
  //app.use('/api/delivery', deliveryRoutes);
 // app.use('/api/products', productRoutes);
  // और भी जितने modules हैं, उन्हें यहीं bind करें
}
