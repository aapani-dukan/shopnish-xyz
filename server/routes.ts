// server/routes.ts

import express, { type Express, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";
import { z } from "zod";

import { storage } from "./storage";
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken";
import { requireAuth } from "./middleware/requireAuth";
import { parseIntParam } from "./util/parseIntParam";
import {
  insertCartItemSchema,
  insertOrderSchema,
  insertReviewSchema,
} from "../shared/backend/schema";

// Routers
import adminVendorsRouter from "./roots/admin/vendors";
import adminProductsRouter from "./roots/admin/products";
import adminPasswordRoutes from "./roots/admin/admin-password";
import sellersApplyRouter from "../routes/sellers/apply";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRouter from "../routes/sellerMe";

// Optional Firebase Authenticated Request type
interface FirebaseAuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
  };
}

export async function registerRoutes(app: Express): Promise<void> {
  // --- AUTH ROUTES ---
  app.post("/api/auth/login", async (req: FirebaseAuthenticatedRequest, res: Response) => {
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
        const role = requestedRole === "seller" ? "seller" : "customer";
        const approvalStatus = role === "seller" ? "pending" : "approved";
        user = await storage.createUser({
          email,
          firebaseUid: uid,
          name: name || email,
          role,
          approvalStatus,
        });
        isNewUser = true;
      }

      const token = jwt.sign(
        {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      let sellerDetails = undefined;
      let finalApprovalStatus = user.approvalStatus;
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
  app.post("/api/delivery/login", async (req: FirebaseAuthenticatedRequest, res: Response) => {
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
        deliveryBoy = await storage.createDeliveryBoy({
          email: email!,
          firebaseUid: uid,
          name: name || email!,
          approvalStatus: "pending",
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
      if (!req.user?.uid) return res.status(401).json({ message: "Unauthorized." });
      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid);
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
      const featured = req.query.featured === "true";
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const search = req.query.search as string | undefined;
      const products = await storage.getProducts({ featured, categoryId, search });
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
      const product = await storage.getProductById(id);
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
    const orders = await storage.getOrdersByUserId(req.user!.id);
    res.json(orders);
  });

  app.get("/api/orders/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const id = parseIntParam(req.params.id, "order ID", res);
    if (id === null) return;
    const order = await storage.getOrderById(id, req.user!.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  });

  // --- REVIEWS ---
  app.get("/api/products/:id/reviews", async (req, res) => {
    const productId = parseIntParam(req.params.id, "product ID", res);
    if (productId === null) return;
    const reviews = await storage.getReviewsByProductId(productId);
    res.json(reviews);
  });

  app.post("/api/products/:id/reviews", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const productId = parseIntParam(req.params.id, "product ID", res);
    if (productId === null) return;
    try {
      const parsed = insertReviewSchema.parse({ ...req.body, productId, customerId: req.user!.id });
      const review = await storage.addReview(parsed);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid review", errors: err.errors });
      res.status(500).json({ message: "Failed to add review." });
    }
  });
    }
