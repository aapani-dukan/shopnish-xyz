// server/routes.ts
import express, { type Express, Request, Response } from "express";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken";
import { requireAuth } from "./middleware/requireAuth";
import { parseIntParam } from "./util/parseIntParam";
import {
  insertCartItemSchema,
  insertOrderSchema,
  insertReviewSchema,
} from "../shared/backend/schema"; // schema.ts से User प्रकार की आवश्यकता नहीं है, लेकिन ठीक है

// Routers
import pendingSellersRouter from "../routes/sellers/pending";
import sellersApplyRouter from "../routes/sellers/apply";
import sellersApproveRouter from "../routes/sellers/approve";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRouter from "../routes/sellerMe";

export async function registerRoutes(app: Express): Promise<void> {
  try {
    // Note: Seed database only once, perhaps in a separate script or conditional check
    // await seedDatabase(); // Consider commenting this out after initial setup
    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }

  // --- AUTH ROUTES ---
  app.post("/api/auth/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed." });
      }

      const { email, uid, displayName } = req.user;
      // role query param से आता है, यदि उपलब्ध हो (उदाहरण के लिए, admin login के लिए)
      const requestedRole = (req.query.role as string) || "customer";

      let user = await storage.getUserByEmail(email);
      let isNewUser = false;

      if (!user) {
        // नया यूज़र बनाएं
        user = await storage.createUser({
          email,
          firebaseUid: uid,
          name: displayName || email.split('@')[0],
          role: requestedRole === "seller" ? "customer" : requestedRole, // विक्रेता रोल के लिए सीधे 'seller' असाइन न करें
                                                                       // क्योंकि अनुमोदन की आवश्यकता होती है।
                                                                       // यदि कोई Google से लॉग इन कर रहा है, तो वह
                                                                       // डिफ़ॉल्ट रूप से 'customer' या 'requestedRole' होगा
                                                                       // (यदि यह "admin" या "delivery" जैसा कुछ है)।
          approvalStatus: "approved" // नए ग्राहक डिफ़ॉल्ट रूप से अनुमोदित होते हैं
        });
        isNewUser = true;
        console.log(`New user created: ${user.email}`);
      } else {
        console.log(`Existing user logged in: ${user.email}`);
      }

      // ✅ यहाँ मुख्य बदलाव: 'user' ऑब्जेक्ट को 'uuid' प्रॉपर्टी के साथ भेजें
      // storage.getUserByEmail और storage.createUser को 'id' प्रॉपर्टी के साथ एक
      // यूज़र ऑब्जेक्ट वापस करना चाहिए, जो कि आपका Drizzle 'id' (इंटीजर) है।
      // हम उसे फ्रंटएंड की अपेक्षा के लिए 'uuid' प्रॉपर्टी में मैप कर रहे हैं।
      res.json({
        message: isNewUser ? "User created and logged in successfully" : "Login successful",
        user: {
          uuid: user.id.toString(), // ✅ user.id को string में बदलकर 'uuid' प्रॉपर्टी के रूप में भेजें
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus, // Ensure this is present if your User model has it
          // यदि user का role 'seller' है, तो seller-specific details भी भेजें
          seller: user.role === "seller" ? { approvalStatus: user.approvalStatus } : undefined,
          // अन्य यूज़र प्रॉपर्टीज जिन्हें आप फ्रंटएंड को भेजना चाहते हैं
        }
      });

    } catch (error) {
      console.error("Error in /api/auth/login:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  // --- SELLER ROUTES ---
  app.use("/api/sellers/pending", pendingSellersRouter);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/approve", sellersApproveRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use("/api/seller/me", sellerMeRouter);

  // --- DELIVERY LOGIN ---
  app.post("/api/delivery/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed." });
      }

      const { email, uid, displayName } = req.user;

      let deliveryBoy = await storage.getDeliveryBoyByEmail(email);
      let isNewDeliveryBoy = false;

      if (!deliveryBoy) {
        deliveryBoy = await storage.createDeliveryBoy({
          email,
          firebaseUid: uid,
          name: displayName || email.split('@')[0],
          approvalStatus: "pending" // नए डिलीवरी बॉय को लंबित मानें
        });
        isNewDeliveryBoy = true;
        console.log(`New delivery boy created: ${deliveryBoy.email}`);
      } else {
        console.log(`Delivery boy logged in: ${deliveryBoy.email}`);
      }

      // ✅ यहाँ भी 'user' ऑब्जेक्ट को 'uuid' प्रॉपर्टी के साथ भेजें
      // user.id को string में बदलें और इसे uuid प्रॉपर्टी में मैप करें
      res.json({
        message: isNewDeliveryBoy ? "Delivery boy created and logged in successfully" : "Login successful",
        user: {
          uuid: deliveryBoy.id.toString(), // ✅ deliveryBoy.id को string में बदलकर 'uuid' प्रॉपर्टी के रूप में भेजें
          email: deliveryBoy.email,
          name: deliveryBoy.name,
          role: "delivery", // हार्डकोड करें क्योंकि यह डिलीवरी बॉय लॉगिन है
          approvalStatus: deliveryBoy.approvalStatus,
          // अन्य डिलीवरी बॉय प्रॉपर्टीज जिन्हें आप फ्रंटएंड को भेजना चाहते हैं
        }
      });
    } catch (error) {
      console.error("Error in /api/delivery/login:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  app.get("/api/delivery/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid);
      if (!deliveryBoy) return res.status(404).json({ message: "Not found" });

      // ✅ 'user' ऑब्जेक्ट को 'uuid' प्रॉपर्टी के साथ भेजें
      res.json({ user: {
        uuid: deliveryBoy.id.toString(), // ✅ deliveryBoy.id को string में बदलकर 'uuid' प्रॉपर्टी के रूप में भेजें
        ...deliveryBoy, // शेष गुण
        role: "delivery"
      }});
    } catch (error) {
      console.error("Error in /api/delivery/me:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });


  // --- PRODUCT & CATEGORY ROUTES ---
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
    } catch (error) {
      console.error("Error fetching products:", error);
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
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product." });
    }
  });

  // --- CART ROUTES ---
  // ✅ ध्यान दें: यहाँ req.user.id का उपयोग किया जा रहा है। सुनिश्चित करें कि storage.getUserByEmail
  // और storage.createUser से returned user ऑब्जेक्ट में 'id' प्रॉपर्टी शामिल हो जो कि एक नंबर है।
  // चूंकि हमने frontend में user.uuid को user.id.toString() से मैप किया है,
  // frontend से भेजे गए user.id को अब backend में parseInt() करने की आवश्यकता हो सकती है यदि
  // related table columns integer types हैं।
  // यहाँ, `req.user.id` Firebase UID से आ रहा है (यदि verifyToken इसे सेट करता है),
  // जो एक स्ट्रिंग है। यदि आपके Drizzle स्कीमा में Foreign Keys `integer` हैं, तो यह यहाँ
  // एक बेमेल पैदा करेगा।
  // आपको `storage.getCartItemsByUserId(parseInt(req.user.id))` या
  // अपने `storage` फ़ंक्शंस को स्ट्रिंग `id` को हैंडल करने के लिए अपडेट करना होगा।

  app.get("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      // यदि storage functions को integer ID चाहिए, तो इसे parseInt करें।
      // या, storage functions को string ID स्वीकार करने के लिए अपडेट करें।
      const cartItems = await storage.getCartItemsByUserId(req.user.id); // या parseInt(req.user.id)
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart." });
    }
  });

  app.post("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const parsedItem = insertCartItemSchema.parse({ ...req.body, userId: req.user.id }); // या parseInt(req.user.id)
      const cartItem = await storage.addCartItem(parsedItem);
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cart item data", errors: error.errors });
      }
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add to cart." });
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
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const updatedItem = await storage.updateCartItemQuantity(itemId, req.user.id, quantity); // या parseInt(req.user.id)
      if (!updatedItem) return res.status(404).json({ message: "Cart item not found." });
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item." });
    }
  });

  app.delete("/api/cart/:id", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    const itemId = parseIntParam(req.params.id, "cart item ID", res);
    if (itemId === null) return;

    try {
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      await storage.removeCartItem(itemId, req.user.id); // या parseInt(req.user.id)
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cart item:", error);
      res.status(500).json({ message: "Failed to delete cart item." });
    }
  });

  app.delete("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      await storage.clearCart(req.user.id); // या parseInt(req.user.id)
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart." });
    }
  });

  // --- ORDER ROUTES ---
  app.post("/api/orders", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const parsedOrder = insertOrderSchema.parse({ ...req.body, customerId: req.user.id }); // या parseInt(req.user.id)
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
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const orders = await storage.getOrdersByUserId(req.user.id); // या parseInt(req.user.id)
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
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const order = await storage.getOrderById(orderId, req.user.id); // या parseInt(req.user.id)
      if (!order) return res.status(404).json({ message: "Order not found." });
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order." });
    }
  });

  // --- REVIEWS ---
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
      // ✅ महत्वपूर्ण: req.user.id अब एक स्ट्रिंग (Firebase UID) हो सकता है।
      const parsedReview = insertReviewSchema.parse({ ...req.body, productId, customerId: req.user.id }); // या parseInt(req.user.id)
      const review = await storage.addReview(parsedReview);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error adding review:", error);
      res.status(500).json({ message: "Failed to add review." });
    }
  });
  }
