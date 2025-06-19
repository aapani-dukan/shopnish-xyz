// server/routes.ts
import express, { type Express, Request, Response } from "express";
import { storage } from "./storage"; // सुनिश्चित करें कि storage इंस्टेंस सही ढंग से एक्सपोर्ट हो रहा है
import { seedDatabase } from "./seed";
import { z } from "zod"; // Zod का उपयोग किया जा रहा है
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken";

// --- राउटर्स को इम्पोर्ट करें ---
// विक्रेता रूट्स
import pendingSellersRouter from "../routes/sellers/pending"; // Router का उपयोग करें
import sellersApplyRouter from "../routes/sellers/apply";
import sellersApproveRouter from "../routes/sellers/approve";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRouter from "../routes/sellerMe"; // Router का नामकरण बेहतर करें

// ✅ डिलीवरी बॉय रूट्स
// यदि आप इन्हें अलग फाइलों में रखते हैं, तो उन्हें इम्पोर्ट करें
// import deliveryLoginRouter from "../routes/delivery/login"; // Router का नामकरण करें
// import deliveryMeRouter from "../routes/delivery/me"; // Router का नामकरण करें

export async function registerRoutes(app: Express): Promise<void> {
  // डेटाबेस सीडिंग
  try {
    await seedDatabase();
    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Failed to seed database:", error);
    // यदि सीडिंग विफल होती है, तो सर्वर को बंद करना चाह सकते हैं या चेतावनी देना चाह सकते हैं
    // process.exit(1);
  }

  // --- ऑथेंटिकेशन रूट्स ---
  app.post("/api/auth/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        console.warn("Authentication failed: No user information available after token verification.");
        return res.status(401).json({ message: "Authentication failed." });
      }

      const { email, uid, displayName } = req.user;

      let user = await storage.getUserByEmail(email);

      if (!user) {
        user = await storage.createUser({
          email: email,
          firebaseUid: uid,
          name: displayName || email.split('@')[0],
          role: "customer",
          approvalStatus: "approved"
        });
        console.log(`New user created in database: ${user.email} (UID: ${user.firebaseUid})`);
      } else {
        console.log(`Existing user logged in: ${user.email} (UID: ${user.firebaseUid})`);
      }

      res.json({
        message: "Authentication successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firebaseUid: user.firebaseUid,
          role: user.role,
          approvalStatus: user.approvalStatus,
        }
      });

    } catch (error) {
      console.error("Error during /api/auth/login:", error);
      res.status(500).json({ message: "Internal server error during authentication process." });
    }
  });

  // --- विक्रेता रूट्स ---
  app.use("/api/sellers/pending", pendingSellersRouter);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/approve", sellersApproveRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use("/api/seller/me", sellerMeRouter); // '/api/seller/me' पाथ जोड़ें, क्योंकि sellerMeRouter सिर्फ '/' रूट पर काम करता है


  // --- ✅ डिलीवरी बॉय रूट्स (विकल्प 1: सीधे routes.ts में परिभाषित) ---
  // यदि आप इन्हें अलग फाइलों में नहीं रखना चाहते, तो यह तरीका ठीक है।
  app.post("/api/delivery/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed: No user information available." });
      }

      const { email, uid, displayName } = req.user;

      let deliveryBoy = await storage.getDeliveryBoyByEmail(email); // सुनिश्चित करें कि storage में यह फंक्शन है

      if (!deliveryBoy) {
        // अगर डिलीवरी बॉय मौजूद नहीं है, तो उसे बनाएं
        deliveryBoy = await storage.createDeliveryBoy({ // सुनिश्चित करें कि storage में यह फंक्शन है
          email: email,
          firebaseUid: uid,
          name: displayName || email.split('@')[0],
          // यदि आपके पास डिलीवरी बॉय स्कीमा में firstName, lastName आदि हैं, तो उन्हें यहाँ जोड़ें
          approvalStatus: "pending"
        });
        console.log(`New delivery boy created: ${deliveryBoy.email}`);
      } else {
        console.log(`Existing delivery boy logged in: ${deliveryBoy.email}`);
      }

      res.json({
        message: "Delivery boy login successful",
        user: { // 'user' key का उपयोग करें ताकि फ्रंटएंड का AuthContext इसे समझ सके
          id: deliveryBoy.id,
          email: deliveryBoy.email,
          name: deliveryBoy.name,
          firebaseUid: deliveryBoy.firebaseUid,
          role: "delivery", // ✅ भूमिका 'delivery' होनी चाहिए
          approvalStatus: deliveryBoy.approvalStatus,
        }
      });

    } catch (error) {
      console.error("Error during /api/delivery/login:", error);
      res.status(500).json({ message: "Internal server error during delivery boy authentication." });
    }
  });

  // ✅ /api/delivery/me route (FrontEnd GET करता है)
  app.get("/api/delivery/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized: No token provided." });
      }
      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid); // सुनिश्चित करें कि storage में यह फंक्शन है
      if (!deliveryBoy) {
        console.warn(`Delivery boy not found for UID: ${req.user.uid}`);
        return res.status(404).json({ message: "Delivery boy not found." });
      }
      res.json({ user: { // 'user' key में भेजें
          id: deliveryBoy.id,
          email: deliveryBoy.email,
          name: deliveryBoy.name,
          firebaseUid: deliveryBoy.firebaseUid,
          role: "delivery", // भूमिका 'delivery' होनी चाहिए
          approvalStatus: deliveryBoy.approvalStatus,
        }
      });
    } catch (error) {
      console.error("Error fetching delivery boy details (/api/delivery/me):", error);
      res.status(500).json({ message: "Failed to fetch delivery boy details." });
    }
  });


  // --- बाकी के API रूट्स (मौजूदा) ---
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories." });
    }
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const featured = req.query.featured === 'true';
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const search = req.query.search as string | undefined;

      const products = await storage.getProducts({ featured, categoryId, search });
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products." });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
      res.json(product);
    } catch (error) {
      console.error(`Error fetching product with ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch product." });
    }
  });

  // कार्ट रूट्स (उदाहरण - आपको अपने storage में इन फंक्शंस को लागू करना होगा)
  app.get("/api/cart", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const cartItems = await storage.getCartItemsByUserId(req.user.id);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart." });
    }
  });

  app.post("/api/cart", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const parsedItem = insertCartItemSchema.parse({ ...req.body, userId: req.user.id });
      const cartItem = await storage.addCartItem(parsedItem);
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cart item data", errors: error.errors });
      }
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add item to cart." });
    }
  });

  app.put("/api/cart/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid cart item ID." });
      }
      const { quantity } = req.body;
      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive number." });
      }
      const updatedItem = await storage.updateCartItemQuantity(itemId, req.user.id, quantity);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found or does not belong to user." });
      }
      res.json(updatedItem);
    } catch (error) {
      console.error(`Error updating cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update cart item." });
    }
  });

  app.delete("/api/cart/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid cart item ID." });
      }
      await storage.removeCartItem(itemId, req.user.id);
      res.status(204).send(); // No content for successful deletion
    } catch (error) {
      console.error(`Error deleting cart item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete cart item." });
    }
  });

  app.delete("/api/cart", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      await storage.clearCart(req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart." });
    }
  });

  // ऑर्डर्स रूट्स (उदाहरण - आपको अपने storage में इन फंक्शंस को लागू करना होगा)
  app.post("/api/orders", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const parsedOrder = insertOrderSchema.parse({ ...req.body, userId: req.user.id });
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

  app.get("/api/orders", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const orders = await storage.getOrdersByUserId(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders." });
    }
  });

  app.get("/api/orders/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID." });
      }
      const order = await storage.getOrderById(orderId, req.user.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found or does not belong to user." });
      }
      res.json(order);
    } catch (error) {
      console.error(`Error fetching order ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch order." });
    }
  });

  // रिव्यूज रूट्स (उदाहरण - आपको अपने storage में इन फंक्शंस को लागू करना होगा)
  app.get("/api/products/:id/reviews", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      const reviews = await storage.getReviewsByProductId(productId);
      res.json(reviews);
    } catch (error) {
      console.error(`Error fetching reviews for product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch reviews." });
    }
  });

  app.post("/api/products/:id/reviews", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated." });
      }
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      const parsedReview = insertReviewSchema.parse({ ...req.body, productId, userId: req.user.id });
      const review = await storage.addReview(parsedReview);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error(`Error adding review for product ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to add review." });
    }
  });
    }
