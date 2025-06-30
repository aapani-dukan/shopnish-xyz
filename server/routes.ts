// server/routes.ts

import express, { type Express, Request, Response, NextFunction } from "express"; // NextFunction भी जोड़ा
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";
import { z } from "zod";

import { storage } from "./storage";
// AuthenticatedRequest को अब सीधे '@/shared/types' से इम्पोर्ट करें
// verifyToken middleware से नहीं, क्योंकि वह खुद इसे इम्पोर्ट करता है
import { AuthenticatedRequest, AuthenticatedUser } from "@/shared/types";
import { verifyToken } from "./middleware/verifyToken"; // verifyToken middleware को अभी भी इम्पोर्ट करें
import { requireAuth } from "./middleware/requireAuth";
import { parseIntParam } from "./util/parseIntParam";
import {
  insertCartItemSchema,
  insertOrderSchema,
  insertReviewSchema,
} from "@/shared/backend/schema"; // पाथ एलियास का उपयोग करें

// Routers
import adminVendorsRouter from "./roots/admin/vendors";
import adminProductsRouter from "./roots/admin/products";
import adminPasswordRoutes from "./roots/admin/admin-password";
// पाथ्स को ठीक किया गया ताकि वे server/routes.ts से रिलेटिव हों
import sellersApplyRouter from "./roots/sellers/apply";
import sellersRejectRouter from "./roots/sellers/reject";
import sellerMeRouter from "./roots/sellerMe";


// FirebaseAuthenticatedRequest को AuthenticatedRequest के समान ही रखें
// क्योंकि verifyToken middleware इसे बदल देगा
interface FirebaseAuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
  };
}

export async function registerRoutes(app: Express): Promise<void> {
  // --- AUTH ROUTES ---
  // यहां req: Request का उपयोग करें, क्योंकि FirebaseAuthenticatedRequest केवल यहां लोकल है
  // और app.post Express के Request टाइप की अपेक्षा करता है
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const firebaseIdToken = req.headers.authorization?.split(" ")[1];
      if (!firebaseIdToken) return res.status(401).json({ message: "Authorization token missing." });

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err) {
        console.error("Token verification failed:", err);
        return res.status(401).json({ message: "Invalid or expired token." });
      }

      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const name = decodedToken.name || email?.split("@")[0];
      const requestedRole = (req.query.role as string) || "customer";

      if (!uid || !email) return res.status(401).json({ message: "User data missing." });

      let user = await storage.getUserByFirebaseUid(uid);
      let isNewUser = false;

      if (!user) {
        // भूमिका असाइनमेंट को UserRole टाइप के साथ संगत बनाएं
        const role: AuthenticatedUser['role'] = requestedRole === "seller" ? "seller" : "customer";
        const approvalStatus: AuthenticatedUser['approvalStatus'] = role === "seller" ? "pending" : "approved"; // approvalStatus को AuthenticatedUser से लिया

        user = await storage.createUser({
          email,
          firebaseUid: uid,
          name: name || email,
          role,
          approvalStatus, // यहां approvalStatus फील्ड का उपयोग करें
        });
        isNewUser = true;
      }

      // सुनिश्चित करें कि user ऑब्जेक्ट के गुण सही ढंग से एक्सेस किए गए हैं
      const token = jwt.sign(
        {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus, // यह सुनिश्चित करें कि approvalStatus user ऑब्जेक्ट पर मौजूद है
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      let sellerDetails = undefined;
      let finalApprovalStatus = user.approvalStatus; // user.approvalStatus को सीधे उपयोग करें
      if (user.role === "seller") {
        sellerDetails = await storage.getSellerByUserFirebaseUid(user.firebaseUid);
        if (sellerDetails) finalApprovalStatus = sellerDetails.approvalStatus;
      }

      res.json({
        message: isNewUser ? "User created and logged in" : "Login successful",
        token,
        user: {
          uuid: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          seller: sellerDetails,
          approvalStatus: finalApprovalStatus,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // --- DELIVERY LOGIN ---
  app.post("/api/delivery/login", async (req: Request, res: Response) => { // यहां भी req: Request का उपयोग करें
    try {
      const firebaseIdToken = req.headers.authorization?.split(" ")[1];
      if (!firebaseIdToken) return res.status(401).json({ message: "Authorization token missing." });

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err) {
        return res.status(401).json({ message: "Invalid Firebase token." });
      }

      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const name = decodedToken.name || email?.split("@")[0];

      if (!uid) return res.status(401).json({ message: "UID missing." });

      let deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(uid);
      let isNew = false;
      if (!deliveryBoy) {
        // email और name के लिए नॉन-नलेबल टाइप की अपेक्षा होने पर
        // खाली स्ट्रिंग प्रदान करें यदि वे null हैं
        deliveryBoy = await storage.createDeliveryBoy({
            email: email || "", // null हो सकता है, तो खाली स्ट्रिंग दें
            firebaseUid: uid,
            name: name || email || "", // null हो सकता है, तो खाली स्ट्रिंग दें
            approvalStatus: "pending",
            vehicleType: "bike",
        });
        isNew = true;
      }

      const token = jwt.sign(
        {
          id: deliveryBoy.id,
          firebaseUid: deliveryBoy.firebaseUid,
          email: deliveryBoy.email,
          role: "delivery",
          approvalStatus: deliveryBoy.approvalStatus,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      res.json({
        message: isNew ? "Delivery boy created and logged in" : "Login successful",
        token,
        user: {
          uuid: deliveryBoy.id.toString(),
          email: deliveryBoy.email,
          name: deliveryBoy.name,
          role: "delivery",
          approvalStatus: deliveryBoy.approvalStatus,
        },
      });
    } catch (err) {
      console.error("Delivery login error:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  app.get("/api/delivery/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.userId) return res.status(401).json({ message: "Unauthorized." }); // userId का उपयोग करें
      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.userId); // userId का उपयोग करें
      if (!deliveryBoy) return res.status(404).json({ message: "Profile not found." });
      res.json({ user: { uuid: deliveryBoy.id.toString(), ...deliveryBoy, role: "delivery" } });
    } catch (err) {
      console.error("Error fetching delivery profile:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // --- ADMIN ROUTES ---
  app.use("/api/admin/vendors", adminVendorsRouter);
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin-login", adminPasswordRoutes);

  // --- SELLER ROUTES ---
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use("/api/seller-me", sellerMeRouter);

  // --- PUBLIC CATEGORIES & PRODUCTS ---
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch categories." });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      // getProducts विधि में 'featured' प्रॉपर्टी की उपलब्धता की पुष्टि करें।
      // यदि यह स्कीमा का हिस्सा नहीं है, तो इसे या तो जोड़ें या यहां से हटा दें।
      // अभी के लिए, मान लें कि storage.getProducts इसे लेता है।
      const featured = req.query.featured === "true";
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const search = req.query.search as string | undefined;
      const products = await storage.getProducts({ featured, categoryId, search }); // featured को पास किया
      res.json(products);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch products." });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = parseIntParam(req.params.id, "productId", res);
    if (id === null) return;
    try {
      // 'getProductById' का नाम 'getProduct' में बदलें यदि storage में यही नाम है
      const product = await storage.getProduct(id); // मेथड का नाम बदला
      if (!product) return res.status(404).json({ message: "Product not found." });
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch product." });
    }
  });

  // --- CART ---
  app.get("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const cartItems = await storage.getCartItemsByUserId(req.user.id);
    res.json(cartItems);
  });

  app.post("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertCartItemSchema.parse({ ...req.body, userId: req.user!.id });
      const item = await storage.addCartItem(parsed);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid cart item", errors: err.errors });
      res.status(500).json({ message: "Failed to add to cart." });
    }
  });

  app.put("/api/cart/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = parseIntParam(req.params.id, "cart item ID", res);
    if (id === null) return;
    const { quantity } = req.body;
    if (typeof quantity !== "number" || quantity <= 0) return res.status(400).json({ message: "Invalid quantity." });

    const updated = await storage.updateCartItemQuantity(id, req.user!.id, quantity);
    if (!updated) return res.status(404).json({ message: "Cart item not found." });
    res.json(updated);
  });

  app.delete("/api/cart/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = parseIntParam(req.params.id, "cart item ID", res);
    if (id === null) return;
    await storage.removeCartItem(id, req.user!.id);
    res.status(204).send();
  });

  app.delete("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    await storage.clearCart(req.user!.id);
    res.status(204).send();
  });

  // --- ORDERS ---
  app.post("/api/orders", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = insertOrderSchema.parse({ ...req.body, customerId: req.user!.id });
      const order = await storage.createOrder(parsed);
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid order", errors: err.errors });
      res.status(500).json({ message: "Failed to create order." });
    }
  });

  app.get("/api/orders", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    // 'getOrdersByUserId' का नाम 'getOrders' में बदलें यदि storage में यही नाम है
    const orders = await storage.getOrders(req.user!.id); // मेथड का नाम बदला
    res.json(orders);
  });

  app.get("/api/orders/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = parseIntParam(req.params.id, "order ID", res);
    if (id === null) return;
    // 'getOrderById' का नाम 'getOrder' में बदलें यदि storage में यही नाम है
    const order = await storage.getOrder(id, req.user!.id); // मेथड का नाम बदला
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  });

  // --- REVIEWS ---
  app.get("/api/products/:id/reviews", async (req, res) => {
    const productId = parseIntParam(req.params.id, "product ID", res);
    if (productId === null) return;
    // 'getReviewsByProductId' का नाम 'getReviews' में बदलें यदि storage में यही नाम है
    const reviews = await storage.getReviews(productId); // मेथड का नाम बदला
    res.json(reviews);
  });

  app.post("/api/products/:id/reviews", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const productId = parseIntParam(req.params.id, "product ID", res);
    if (productId === null) return;
    try {
      const parsed = insertReviewSchema.parse({ ...req.body, productId, customerId: req.user!.id });
      // 'addReview' का नाम 'createReview' में बदलें यदि storage में यही नाम है
      const review = await storage.createReview(parsed); // मेथड का नाम बदला
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid review", errors: err.errors });
      res.status(500).json({ message: "Failed to add review." });
    }
  });
}
