// server/routes.ts
import express, { type Express, Request, Response } from "express"; // Request, Response भी इम्पोर्ट करें
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertProductSchema, insertCartItemSchema, insertOrderSchema, insertReviewSchema } from "@shared/backend/schema";
import { z } from "zod";
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken"; // verifyToken और AuthenticatedRequest इम्पोर्ट करें

// routes.ts
import pendingSellersRoute from "../routes/sellers/pending";
import sellersApplyRouter from "../routes/sellers/apply";
import sellersApproveRouter from "../routes/sellers/approve";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRoute from "../routes/sellerMe";


// ✅ अब यह कोई HTTP सर्वर नहीं लौटाएगा, बल्कि केवल राउट्स रजिस्टर करेगा
export async function registerRoutes(app: Express): Promise<void> {
  // Seed database on startup
  try {
    await seedDatabase();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }

  // --- ऑथेंटिकेशन रूट्स ---

  // ✅ नया लॉगिन/टोकन सत्यापन रूट जोड़ा गया है
  // यह रूट फ्रंटएंड से Firebase ID टोकन प्राप्त करेगा।
  // verifyToken मिडिलवेयर टोकन को सत्यापित करेगा और req.user में यूज़र डेटा अटैच करेगा।
  app.post("/api/auth/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // यदि verifyToken मिडिलवेयर सफल होता है, तो req.user में डिकोडेड टोकन जानकारी होगी
      if (!req.user) {
        // यह स्थिति केवल तभी होनी चाहिए जब verifyToken में कोई अप्रत्याशित समस्या हो
        return res.status(401).json({ message: "Authentication failed: No user information available after token verification." });
      }

      const { email, uid, displayName } = req.user;

      // आप यहां डेटाबेस में यूज़र को चेक/बना सकते हैं यदि आवश्यक हो
      // उदाहरण के लिए, एक placeholder storage.getUserByEmail और storage.createUser फ़ंक्शन का उपयोग किया गया है।
      // आपको अपनी storage.ts फ़ाइल में इन्हें लागू करना होगा।
      let user = await storage.getUserByEmail(email); // आपको इसे storage.ts में जोड़ना होगा
      if (!user) {
        // यदि यूज़र मौजूद नहीं है, तो उसे बनाएं
        user = await storage.createUser({ // आपको इसे storage.ts में जोड़ना होगा
          email: email,
          firebaseUid: uid, // Firebase UID को स्टोर करें
          name: displayName || email.split('@')[0],
          // अन्य आवश्यक फील्ड्स (जैसे रोल, प्रोफाइल जानकारी)
        });
        console.log(`New user created in database: ${user.email} (UID: ${user.firebaseUid})`);
      } else {
        console.log(`Existing user logged in: ${user.email} (UID: ${user.firebaseUid})`);
      }

      // सक्सेसफुल रिस्पांस भेजें जिसमें यूज़र डेटा शामिल हो
      res.json({
        message: "Authentication successful",
        user: {
          id: user.id, // डेटाबेस से यूज़र ID (अगर आप इसे स्टोर करते हैं)
          email: user.email,
          name: user.name,
          firebaseUid: user.firebaseUid,
          // अन्य यूज़र डेटा जो आप फ्रंटएंड को भेजना चाहते हैं
        }
      });

    } catch (error) {
      console.error("Error during /api/auth/login:", error);
      // सुनिश्चित करें कि यह JSON प्रतिक्रिया भेजता है
      res.status(500).json({ message: "Internal server error during authentication process." });
    }
  });


  // --- विक्रेता रूट्स ---
  app.use("/api/sellers/pending", pendingSellersRoute);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/approve", sellersApproveRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use(sellerMeRoute);


  // --- बाकी के API रूट्स ---
  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, featured, search } = req.query;
      const filters: any = {};

      if (categoryId) filters.categoryId = parseInt(categoryId as string);
      if (featured) filters.featured = featured === 'true';
      if (search) filters.search = search as string;

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Cart
  app.get("/api/cart", async (req, res) => {
    try {
      const { userId, sessionId } = req.query;
      const cartItems = await storage.getCartItems(
        userId ? parseInt(userId as string) : undefined,
        sessionId as string
      );
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const validation = insertCartItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid cart item data" });
      }

      const cartItem = await storage.addToCart(validation.data);
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;

      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const cartItem = await storage.updateCartItem(id, quantity);
      if (!cartItem && quantity > 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeFromCart(id);

      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove item from cart" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      const { userId, sessionId } = req.query;
      const success = await storage.clearCart(
        userId ? parseInt(userId as string) : undefined,
        sessionId as string
      );

      res.json({ message: "Cart cleared", success });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Orders
  app.post("/api/orders", async (req, res) => {
    try {
      const { order, items } = req.body;

      const orderValidation = insertOrderSchema.safeParse(order);
      if (!orderValidation.success) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order must have items" });
      }

      const createdOrder = await storage.createOrder(orderValidation.data, items);
      res.json(createdOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { customerId } = req.query;
      const filters: any = {};

      if (customerId) {
        filters.customerId = parseInt(customerId as string);
      }

      const orders = await storage.getOrders(filters);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Reviews
  app.get("/api/products/:id/reviews", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getProductReviews(productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/products/:id/reviews", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviewData = { ...req.body, productId };

      const validation = insertReviewSchema.safeParse(reviewData);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid review data" });
      }

      const review = await storage.createReview(validation.data);
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });
  }
