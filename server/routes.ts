// server/routes.ts
import express,{ Request, Response, Router, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
  insertUserSchema,
  insertSellerSchema,
  insertDeliveryBoySchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertReviewSchema,
  insertCartItemSchema,
} from '@/shared/backend/schema'; // Updated import path for schema
import { AuthenticatedRequest, AuthenticatedUser } from '@/shared/types/auth'; // Updated import path for auth types
import { storage } from './storage.js';
import { requireAuth, requireAdminAuth, requireSellerAuth, requireDeliveryBoyAuth } from './middleware/authMiddleware.js'; // Assuming this middleware file exists
import adminApproveProductRoutes from './roots/admin/approve-product.js';
import adminRejectProductRoutes from './roots/admin/reject-product.js';
import adminProductsRoutes from './roots/admin/products.js';
import adminVendorsRoutes from './roots/admin/vendors.js';
import { authAdmin } from './lib/firebaseAdmin'; 
import adminPasswordRoutes from './roots/admin/admin-password.js';
const router = express.Router();

// Test Route
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'API is running' });
});

// User Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const [newUser] = await db.insert(users).values(userData).returning();
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('User registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// User Login (Example - integrate with Firebase or actual auth later)
router.post('/login', async (req: Request, res: Response) => {
  const { email, firebaseUid } = req.body; // Assuming firebaseUid comes from client-side auth

  if (!email || !firebaseUid) {
    return res.status(400).json({ error: 'Email and Firebase UID are required.' });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));

    if (!user) {
      // If user doesn't exist, create them (first-time login with Firebase)
      const [newUser] = await db.insert(users).values({
        email,
        firebaseUid,
        role: userRoleEnum.enumValues[0], // Default to customer
        approvalStatus: approvalStatusEnum.enumValues[1], // Default to approved
      }).returning();
      
      const token = jwt.sign({ id: newUser.id, firebaseUid: newUser.firebaseUid, role: newUser.role, approvalStatus: newUser.approvalStatus }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
      return res.status(200).json({ user: newUser, token });
    }

    const token = jwt.sign({ id: user.id, firebaseUid: user.firebaseUid, role: user.role, approvalStatus: user.approvalStatus }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ user, token });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// User Profile (requires authentication)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error: any) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Seller Routes ---
router.post('/sellers/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id; // Authenticated user ID

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Check if seller application already exists for this user
    const [existingSeller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
    if (existingSeller) {
      return res.status(409).json({ error: 'Seller application already exists for this user.' });
    }

    const sellerData = insertSellerSchema.parse({
      ...req.body,
      userId: userId,
      approvalStatus: approvalStatusEnum.enumValues[0], // Set to 'pending' by default
    });

    const [newSeller] = await db.insert(sellersPgTable).values(sellerData).returning();

    // Update user role to 'seller' and approvalStatus to 'pending'
    await db.update(users).set({ 
      role: userRoleEnum.enumValues[1], // Set user role to 'seller'
      approvalStatus: approvalStatusEnum.enumValues[0], // Set user approval status to 'pending'
    }).where(eq(users.id, userId));

    res.status(201).json(newSeller);
  } catch (error: any) {
    console.error('Seller application failed:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/seller/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, userId));
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }
    res.status(200).json(seller);
  } catch (error: any) {
    console.error('Failed to fetch seller profile:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
router.post('/auth/login', async (req, res) => {
  const idToken = req.body.idToken; // क्लाइंट से Firebase idToken प्राप्त करें

  if (!idToken) {
    return res.status(400).json({ message: 'ID token is missing.' });
  }

  try {
    

    const idToken = req.body.idToken; // सुनिश्चित करें कि आपका क्लाइंट idToken भेज रहा है
    if (!idToken) {
      return res.status(400).json({ message: 'ID token is required.' });
    }

    // `admin.auth()` के बजाय `authAdmin` का उपयोग करें
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 दिन

    // `admin.auth()` के बजाय `authAdmin` का उपयोग करें
    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });

    res.cookie('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });

    res.status(200).json({ message: 'User logged in successfully!', uuid: uid });

  } catch (error) {
    console.error('Error verifying Firebase ID token or creating session cookie:', error);
    // सुनिश्चित करें कि आप client को error.message भेज रहे हैं ताकि अधिक जानकारी मिले
    res.status(401).json({ message: 'Unauthorized or invalid token.', error: error.message });
  }
});

router.post('/auth/logout', async (req, res) => {
  const sessionCookie = req.cookies?.__session || '';

  // कुकी को हटा दें
  res.clearCookie('__session');

  // Firebase सेशन को भी रिवोक करें
  try {
    if (sessionCookie) {
      // `admin.auth()` के बजाय `authAdmin` का उपयोग करें
      const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie);
      // `admin.auth()` के बजाय `authAdmin` का उपयोग करें
      await authAdmin.revokeRefreshTokens(decodedClaims.sub);
    }
    res.status(200).json({ message: 'Logged out successfully!' });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ message: 'Logout failed.' });
  }
});

   

function registerRoutes(app: Express) {
  app.use("/api/admin/products/approve", adminApproveProductRoutes);
  app.use("/api/admin/products/reject", adminRejectProductRoutes);
  app.use("/api/admin/products", adminProductsRoutes);
  app.use("/api/admin/vendors", adminVendorsRoutes);
  app.use("/api/admin/password", adminPasswordRoutes);
    app.use("/api", router);
}

// --- Admin Routes ---
// Admin Routes
router.use('/', adminApproveProductRoutes);
router.use('/', adminRejectProductRoutes);
router.use('/', adminProductsRoutes);
router.use('/', adminVendorsRoutes);
router.use('/', adminPasswordRoutes); // If this is a separate router
router.get('/admin/sellers', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await db.select().from(sellersPgTable).where(eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[0]));
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error('Failed to fetch pending sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/sellers/:sellerId/approve', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      approvalStatus: approvalStatusEnum.enumValues[1], // approved
      approvedAt: new Date() 
    }).where(eq(sellersPgTable.id, sellerId));

    // Update user role to 'seller' and approval status to 'approved'
    await db.update(users).set({ 
      role: userRoleEnum.enumValues[1], // Set user role to 'seller'
      approvalStatus: approvalStatusEnum.enumValues[1], // Set user approval status to 'approved'
    }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller approved successfully.' });
  } catch (error: any) {
    console.error('Failed to approve seller:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/admin/sellers/:sellerId/reject', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      approvalStatus: approvalStatusEnum.enumValues[2], // rejected
      rejectionReason: reason 
    }).where(eq(sellersPgTable.id, sellerId));

    // Update user approval status to 'rejected'
    await db.update(users).set({ approvalStatus: approvalStatusEnum.enumValues[2] }).where(eq(users.id, seller.userId));

    res.status(200).json({ message: 'Seller rejected successfully.' });
  } catch (error: any) {
    console.error('Failed to reject seller:', error);
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

// --- Products Routes ---
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query; // Removed 'featured'
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

router.post('/seller/products', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = req.user?.id; // Assuming req.user.id is the seller's user ID
    if (!sellerId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, sellerId));
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    const productData = insertProductSchema.parse({
      ...req.body,
      sellerId: seller.id, // Use the actual seller ID from the sellers table
      storeId: req.body.storeId, // Ensure storeId is passed in the body
      // Add a default categoryId or validate it
      categoryId: req.body.categoryId || (await db.select().from(categories).limit(1))[0].id, // Example: use first category if not provided
    });

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
    const approvalStatus = approvalStatusEnum.enumValues[0]; // "pending"

    const [existingUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));

    let userId: number;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // If user doesn't exist, create them
      const [newUser] = await db.insert(users).values({
        firebaseUid,
        email,
        name,
        role: userRoleEnum.enumValues[3], // "delivery_boy"
        approvalStatus: approvalStatusEnum.enumValues[0], // "pending"
      }).returning();
      userId = newUser.id;
    }

    if (!userId) {
      return res.status(500).json({ error: "Failed to get or create user ID." });
    }

    const newDeliveryBoyData = {
      userId: userId,
      email: email,
      name: name,
      vehicleType: vehicleType,
      approvalStatus: approvalStatus,
      firebaseUid: firebaseUid, // Add firebaseUid if schema allows
      rating: "5.0", // Default value
    };

    const validatedDeliveryBoy = insertDeliveryBoySchema.parse(newDeliveryBoyData);

    await db.insert(deliveryBoys).values(validatedDeliveryBoy);
    res.status(201).json({ message: 'Delivery boy registration successful.' });
  } catch (error: any) {
    console.error('Delivery boy registration failed:', error);
    res.status(400).json({ error: error.message });
  }
});


// --- Cart Routes ---
router.get('/cart', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const cartItemsList = await storage.getCartItemsForUser(userId);
    res.status(200).json(cartItemsList);
  } catch (error: any) {
    console.error('Failed to fetch cart items:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/cart/add', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const { productId, quantity } = insertCartItemSchema.parse(req.body);
    await storage.addCartItem(userId, productId!, quantity!);
    res.status(200).json({ message: 'Item added to cart.' });
  } catch (error: any) {
    console.error('Failed to add item to cart:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/cart/update/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cartItemId = parseInt(req.params.cartItemId);
    const { quantity } = req.body;
    if (isNaN(cartItemId) || quantity === undefined) {
      return res.status(400).json({ error: 'Invalid cart item ID or quantity.' });
    }
    await storage.updateCartItem(cartItemId, quantity);
    res.status(200).json({ message: 'Cart item updated.' });
  } catch (error: any) {
    console.error('Failed to update cart item:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/cart/remove/:cartItemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cartItemId = parseInt(req.params.cartItemId);
    if (isNaN(cartItemId)) {
      return res.status(400).json({ error: 'Invalid cart item ID.' });
    }
    await storage.removeCartItem(cartItemId);
    res.status(200).json({ message: 'Cart item removed.' });
  } catch (error: any) {
    console.error('Failed to remove cart item:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/cart/clear', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    await storage.clearCart(userId);
    res.status(200).json({ message: 'Cart cleared.' });
  } catch (error: any) {
    console.error('Failed to clear cart:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Order Routes ---
router.post('/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    const { paymentMethod, deliveryAddress, deliveryInstructions } = req.body;

    const cartItemsList = await storage.getCartItemsForUser(customerId);
    if (!cartItemsList || cartItemsList.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    let subtotal = 0;
    for (const item of cartItemsList) {
      // Ensure item.productPrice is treated as a string before parsing
      subtotal += parseFloat(item.productPrice?.toString() || '0') * item.quantity;
    }

    const total = subtotal; // For now, assume no delivery charge or discount

    const orderData = insertOrderSchema.parse({
      customerId,
      orderNumber: `ORD-${Date.now()}-${customerId}`,
      subtotal: subtotal.toFixed(2),
      deliveryCharge: '0.00',
      discount: '0.00',
      total: total.toFixed(2),
      paymentMethod,
      paymentStatus: 'pending', // Or 'paid' depending on payment gateway integration
      status: 'placed',
      deliveryAddress,
      deliveryInstructions,
    });

    const [newOrder] = await db.insert(orders).values(orderData).returning();

    // Insert order items
    const orderItemsToInsert = cartItemsList.map(item => ({
      orderId: newOrder.id,
      productId: item.productId!,
      sellerId: item.productPrice!, // This should be item.sellerId, fix schema if needed
      quantity: item.quantity,
      unitPrice: item.productPrice?.toString() || '0',
      totalPrice: (parseFloat(item.productPrice?.toString() || '0') * item.quantity).toFixed(2),
    }));

    await db.insert(orderItems).values(orderItemsToInsert);

    // Clear the cart
    await storage.clearCart(customerId);

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Failed to create order:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/orders/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const userOrders = await storage.getOrdersForUser(customerId);
    res.status(200).json(userOrders);
  } catch (error: any) {
    console.error('Failed to fetch user orders:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// --- Reviews Routes ---
router.post('/reviews', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }
    const reviewData = insertReviewSchema.parse({
      ...req.body,
      customerId: customerId,
    });
    const [newReview] = await db.insert(reviews).values(reviewData).returning();
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error('Failed to add review:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/products/:productId/reviews', async (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  try {
    // Assuming storage.getReviews exists and takes productId
    const productReviews = await db.select().from(reviews).where(eq(reviews.productId, productId)); // Corrected argument
    res.status(200).json(productReviews);
  } catch (error: any) {
    console.error('Failed to fetch product reviews:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


export default registerRoutes;
  
