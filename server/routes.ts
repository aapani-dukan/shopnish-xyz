import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken"; 
import { requireAuth } from "./middleware/requireAuth";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import * as admin from "firebase-admin";

// Routers
import adminVendorsRouter from "./roots/admin/vendors";
import adminProductsRouter from "./roots/admin/products";
import adminPasswordRoutes from "./roots/admin/admin-password";
import sellersApplyRouter from "./sellers/apply";
import sellersRejectRouter from "./sellers/reject";
import sellerMeRouter from "./sellerMe";

  import { parseIntParam } from "./util/parseIntParam";
import {
  insertCartItemSchema,
  insertOrderSchema,
  insertReviewSchema,
} from "../shared/backend/schema";
// FirebaseAuthenticatedRequest इंटरफेस
interface FirebaseAuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
  };
}

export async function registerRoutes(app: Express): Promise<void> {
  // -------------------------------
  // 🔐 /api/auth/login
  // -------------------------------
  app.post("/api/auth/login", async (req: FirebaseAuthenticatedRequest, res: Response) => {
    try {
      const firebaseIdToken = req.headers.authorization?.split(" ")[1];
      if (!firebaseIdToken) return res.status(401).json({ message: "Authorization token missing." });

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err) {
        console.error("Invalid Firebase ID token:", err);
        return res.status(401).json({ message: "Invalid Firebase token." });
      }

      const { uid, email, name } = decodedToken;
      if (!uid || !email) return res.status(401).json({ message: "Missing Firebase user data." });

      const requestedRole = (req.query.role as string) || "customer";
      let user = await storage.getUserByFirebaseUid(uid);
      let isNewUser = false;

      if (!user) {
        const role = requestedRole === "seller" ? "seller" : "customer";
        const approvalStatus = role === "seller" ? "pending" : "approved";
        user = await storage.createUser({
          firebaseUid: uid,
          email,
          name: name || email.split("@")[0],
          role,
          approvalStatus,
        });
        isNewUser = true;
        console.log(`🆕 New user created: ${email} (${role})`);
      } else {
        console.log(`🔁 Existing user: ${email} (${user.role})`);
      }

      const token = jwt.sign(
        {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      let sellerDetails = undefined;
      if (user.role === "seller") {
        sellerDetails = await storage.getSellerByUserFirebaseUid(user.firebaseUid);
      }

      res.json({
        message: isNewUser ? "User created and logged in" : "Login successful",
        token,
        user: {
          uuid: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: sellerDetails?.approvalStatus || user.approvalStatus,
          seller: sellerDetails,
        },
      });
    } catch (err) {
      console.error("Error in /api/auth/login:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // -------------------------------
  // 📦 Admin + Seller Routes
  // -------------------------------
  app.use("/api/admin/vendors", adminVendorsRouter);
  app.use("/api/admin/products", adminProductsRouter);
  app.use("/api/admin-login", adminPasswordRoutes);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use("/api/seller-me", sellerMeRouter);

  // -------------------------------
  // 🚚 /api/delivery/login
  // -------------------------------
  app.post("/api/delivery/login", async (req: FirebaseAuthenticatedRequest, res: Response) => {
    try {
      const firebaseIdToken = req.headers.authorization?.split(" ")[1];
      if (!firebaseIdToken) return res.status(401).json({ message: "Authorization token missing." });

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      } catch (err) {
        console.error("Invalid Firebase ID token:", err);
        return res.status(401).json({ message: "Invalid Firebase token." });
      }

      const { uid, email, name } = decodedToken;
      if (!uid || !email) return res.status(401).json({ message: "Missing Firebase user data." });

      let deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(uid);
      let isNew = false;

      if (!deliveryBoy) {
        deliveryBoy = await storage.createDeliveryBoy({
          firebaseUid: uid,
          email,
          name: name || email.split("@")[0],
          approvalStatus: "pending",
        });
        isNew = true;
        console.log(`🆕 Delivery boy created: ${email}`);
      } else {
        console.log(`🔁 Delivery boy logged in: ${email}`);
      }

      const token = jwt.sign(
        {
          id: deliveryBoy.id,
          firebaseUid: deliveryBoy.firebaseUid,
          email: deliveryBoy.email,
          role: "delivery",
          approvalStatus: deliveryBoy.approvalStatus,
        },
        process.env.JWT_SECRET!,
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
      console.error("Error in /api/delivery/login:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // -------------------------------
  // 🧾 /api/delivery/me
  // -------------------------------
  app.get("/api/delivery/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.uid) return res.status(401).json({ message: "Unauthorized" });
      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid);
      if (!deliveryBoy) return res.status(404).json({ message: "Delivery profile not found." });

      res.json({
        user: {
          uuid: deliveryBoy.id.toString(),
          ...deliveryBoy,
          role: "delivery",
        },
      });
    } catch (err) {
      console.error("Error in /api/delivery/me:", err);
      res.status(500).json({ message: "Internal server error." });
    }
  });


// --- CATEGORY ROUTE ---
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories." });
  }
});

// --- PRODUCT ROUTES ---
app.get("/api/products", async (req, res) => {
  try {
    const featured = req.query.featured === "true";
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const search = req.query.search as string | undefined;
    const products = await storage.getProducts({ featured, categoryId, search });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

app.get("/api/products/:id", async (req, res) => {
  const id = parseIntParam(req.params.id, "product ID", res);
  if (id === null) return;

  try {
    const product = await storage.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Failed to fetch product." });
  }
});

// --- CART ROUTES ---
app.get("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const cartItems = await storage.getCartItemsByUserId(req.user.id);
    res.json(cartItems);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Failed to fetch cart." });
  }
});

app.post("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const parsedItem = insertCartItemSchema.parse({ ...req.body, userId: req.user.id });
    const cartItem = await storage.addCartItem(parsedItem);
    res.status(201).json(cartItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid cart item", errors: error.errors });
    }
    console.error("Error adding cart item:", error);
    res.status(500).json({ message: "Failed to add cart item." });
  }
});

app.put("/api/cart/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseIntParam(req.params.id, "cart item ID", res);
  if (itemId === null) return;

  const { quantity } = req.body;
  if (typeof quantity !== "number" || quantity <= 0) {
    return res.status(400).json({ message: "Quantity must be a positive number." });
  }

  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const updated = await storage.updateCartItemQuantity(itemId, req.user.id, quantity);
    if (!updated) return res.status(404).json({ message: "Cart item not found." });
    res.json(updated);
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ message: "Failed to update cart item." });
  }
});

app.delete("/api/cart/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  const itemId = parseIntParam(req.params.id, "cart item ID", res);
  if (itemId === null) return;

  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    await storage.removeCartItem(itemId, req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({ message: "Failed to delete cart item." });
  }
});

app.delete("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    await storage.clearCart(req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: "Failed to clear cart." });
  }
});

// --- ORDER ROUTES ---
app.post("/api/orders", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const parsedOrder = insertOrderSchema.parse({ ...req.body, customerId: req.user.id });
    const order = await storage.createOrder(parsedOrder);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid order data", errors: error.errors });
    }
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order." });
  }
});

app.get("/api/orders", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const orders = await storage.getOrdersByUserId(req.user.id);
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

app.get("/api/orders/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  const orderId = parseIntParam(req.params.id, "order ID", res);
  if (orderId === null) return;

  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const order = await storage.getOrderById(orderId, req.user.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order." });
  }
});

// --- REVIEW ROUTES ---
app.get("/api/products/:id/reviews", async (req, res) => {
  const productId = parseIntParam(req.params.id, "product ID", res);
  if (productId === null) return;

  try {
    const reviews = await storage.getReviewsByProductId(productId);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews." });
  }
});

app.post("/api/products/:id/reviews", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
  const productId = parseIntParam(req.params.id, "product ID", res);
  if (productId === null) return;

  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const parsedReview = insertReviewSchema.parse({ ...req.body, productId, customerId: req.user.id });
    const review = await storage.addReview(parsedReview);
    res.status(201).json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid review", errors: error.errors });
    }
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Failed to add review." });
  }
});
}
