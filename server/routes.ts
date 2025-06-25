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
} from "../shared/backend/schema"; 
// Routers
import adminVendorsRouter from "./roots/admin/vendors"; 

import pendingSellersRouter from "../routes/sellers/pending";
import sellersApplyRouter from "../routes/sellers/apply";
import sellersApproveRouter from "../routes/sellers/approve";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRouter from "../routes/sellerMe"; // ✅ यहाँ यह सुनिश्चित करें कि यह sellerMeRouter है न कि sellers/me, यदि आपका फ़ाइल नाम यही है


export async function registerRoutes(app: Express): Promise<void> {
  try {
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

      const { email, uid, name } = req.user;
      const requestedRole = (req.query.role as string) || "customer";

      let user = await storage.getUserByFirebaseUid(uid);
      let isNewUser = false;

      if (!user) {
        // नया यूज़र बनाएं
        let userRole: "customer" | "seller" = "customer"; // डिफ़ॉल्ट कस्टमर
        let userApprovalStatus: "approved" | "pending" | "rejected" = "approved"; // डिफ़ॉल्ट रूप से अनुमोदित

        // अगर रिक्वेस्टेड रोल 'seller' या 'pending_seller' है
        if (requestedRole === "seller" || requestedRole === "pending_seller") {
            userRole = "seller"; // रोल को 'seller' पर सेट करें
            userApprovalStatus = "pending"; // और स्टेटस को 'pending' पर सेट करें
        }

        user = await storage.createUser({
          email: email!,
          firebaseUid: uid,
          name: name || email!.split('@')[0],
          role: userRole, // ✅ अब यह 'seller' या 'customer' होगा
          approvalStatus: userApprovalStatus // ✅ अब यह 'pending' या 'approved' होगा
        });
        isNewUser = true;
        console.log(`New user created: ${user.email} with role: ${user.role} and status: ${user.approvalStatus}`);
      } else {
        console.log(`Existing user logged in: ${user.email} with role: ${user.role} and status: ${user.approvalStatus}`);
      }

      // response में भेजने से पहले, अगर यूजर सेलर है, तो उसकी अपडेटेड डिटेल्स फ़ेच करें
      let sellerDetails = undefined;
      // यूजर का फाइनल अप्रूवल स्टेटस जो फ्रंटएंड को भेजा जाएगा
      let finalApprovalStatus = user.approvalStatus;

      if (user.role === "seller") {
          sellerDetails = await storage.getSellerByUserId(user.id);
          if (sellerDetails) {
              finalApprovalStatus = sellerDetails.approvalStatus; // Seller की असली approvalStatus लें
          }
      }

      res.json({
        message: isNewUser ? "User created and logged in successfully" : "Login successful",
        user: {
          uuid: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role, // ✅ 'seller' या 'customer' होगा
          seller: sellerDetails, // सेलर डिटेल्स भेजें (अगर यूजर सेलर है)
          approvalStatus: finalApprovalStatus, // ✅ यहां सही 'pending'/'approved'/'rejected' स्टेटस आएगा
        }
      });

    } catch (error) {
      console.error("Error in /api/auth/login:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
 
        // ADMIN ROUTES
  app.use("/api/admin/vendors", adminVendorsRouter); 
  // --- SELLER ROUTES ---
  app.use("/api/sellers/pending", pendingSellersRouter);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/approve", sellersApproveRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use("/api/sellers/me", sellerMeRouter); // ✅ सुनिश्चित करें कि यह /api/sellers/me है, आपके `sellerMeRouter` के अंदर `/me` है

  // --- DELIVERY LOGIN ---
  app.post("/api/delivery/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed." });
      }

      const { email, uid, name } = req.user; // ✅ req.user से 'name' का उपयोग करें

      let deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(uid); // ✅ Firebase UID से खोजें
      let isNewDeliveryBoy = false;

      if (!deliveryBoy) {
        deliveryBoy = await storage.createDeliveryBoy({
          email: email!,
          firebaseUid: uid,
          name: name || email!.split('@')[0],
          approvalStatus: "pending" // नए डिलीवरी बॉय को लंबित मानें
        });
        isNewDeliveryBoy = true;
        console.log(`New delivery boy created: ${deliveryBoy.email}`);
      } else {
        console.log(`Delivery boy logged in: ${deliveryBoy.email}`);
      }

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
      if (!req.user || !req.user.uid) return res.status(401).json({ message: "Unauthorized" }); // ✅ uid चेक करें

      const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid);
      if (!deliveryBoy) return res.status(404).json({ message: "Delivery profile not found." }); // ✅ मैसेज स्पष्ट करें

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
  app.get("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      const cartItems = await storage.getCartItemsByUserId(req.user.id); 
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart." });
    }
  });

  app.post("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      const parsedItem = insertCartItemSchema.parse({ ...req.body, userId: req.user.id }); 
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      const updatedItem = await storage.updateCartItemQuantity(itemId, req.user.id, quantity); 
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      await storage.removeCartItem(itemId, req.user.id); 
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cart item:", error);
      res.status(500).json({ message: "Failed to delete cart item." });
    }
  });

  app.delete("/api/cart", verifyToken, requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      const order = await storage.getOrderById(orderId, req.user.id); 
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
      if (req.user?.id === undefined) { // ✅ सुनिश्चित करें कि डेटाबेस ID मौजूद है
        return res.status(401).json({ message: "Unauthorized: User database ID not found." });
      }
      const parsedReview = insertReviewSchema.parse({ ...req.body, productId, customerId: req.user.id }); 
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
