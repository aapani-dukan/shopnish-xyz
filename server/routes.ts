// server/routes.ts
import express, { type Express, Request, Response } from "express";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { insertProductSchema, insertCartItemSchema, insertOrderSchema, insertReviewSchema } from "@shared/backend/schema";
import { z } from "zod";
import { verifyToken, AuthenticatedRequest } from "./middleware/verifyToken";

// routes.ts
import pendingSellersRoute from "../routes/sellers/pending";
import sellersApplyRouter from "../routes/sellers/apply";
import sellersApproveRouter from "../routes/sellers/approve";
import sellersRejectRouter from "../routes/sellers/reject";
import sellerMeRoute from "../routes/sellerMe";

// ✅ डिलीवरी बॉय रूट्स के लिए
import deliveryLoginRoute from "../routes/delivery/login"; // यह आपको बनाना होगा
import deliveryMeRoute from "../routes/delivery/me"; // यह भी आपको बनाना होगा

export async function registerRoutes(app: Express): Promise<void> {
  try {
    await seedDatabase();
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }

  // --- ऑथेंटिकेशन रूट्स (मौजूदा) ---
  app.post("/api/auth/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed: No user information available after token verification." });
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

  // --- विक्रेता रूट्स (मौजूदा) ---
  app.use("/api/sellers/pending", pendingSellersRoute);
  app.use("/api/sellers/apply", sellersApplyRouter);
  app.use("/api/sellers/approve", sellersApproveRouter);
  app.use("/api/sellers/reject", sellersRejectRouter);
  app.use(sellerMeRoute);


  // --- ✅ नए डिलीवरी बॉय रूट्स यहाँ जोड़ें ---
  // आपको इन रूट्स को बनाने के लिए अलग फाइल्स (जैसे server/routes/delivery/login.ts) की आवश्यकता होगी
  // या आप उन्हें सीधे यहां routes.ts में ही बना सकते हैं अगर वे छोटे हैं।

  // उदाहरण के लिए, सीधे routes.ts में जोड़ना:
  app.post("/api/delivery/login", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication failed: No user information available." });
      }

      const { email, uid, displayName } = req.user;

      // अपनी storage.ts में इन फ़ंक्शंस को लागू करें
      let deliveryBoy = await storage.getDeliveryBoyByEmail(email);

      if (!deliveryBoy) {
        // अगर डिलीवरी बॉय मौजूद नहीं है, तो उसे बनाएं
        deliveryBoy = await storage.createDeliveryBoy({
          email: email,
          firebaseUid: uid,
          name: displayName || email.split('@')[0],
          approvalStatus: "pending" // ✅ नए डिलीवरी बॉय का स्टेटस 'pending' होगा
          // अन्य आवश्यक फील्ड्स जैसे firstName, lastName
        });
        console.log(`New delivery boy created: ${deliveryBoy.email}`);
      } else {
        console.log(`Existing delivery boy logged in: ${deliveryBoy.email}`);
      }

      res.json({
        message: "Delivery boy login successful",
        user: { // इसे 'user' के रूप में भेजें ताकि फ्रंटएंड में 'res.user' काम करे
          id: deliveryBoy.id,
          email: deliveryBoy.email,
          name: deliveryBoy.name,
          firebaseUid: deliveryBoy.firebaseUid,
          approvalStatus: deliveryBoy.approvalStatus,
          // यदि आपके डिलीवरी बॉय ऑब्जेक्ट में firstName या अन्य फील्ड्स हैं, तो उन्हें भी यहाँ जोड़ें
        }
      });

    } catch (error) {
      console.error("Error during /api/delivery/login:", error);
      res.status(500).json({ message: "Internal server error during delivery boy authentication." });
    }
  });

  // यदि /api/delivery/me route की आवश्यकता है, तो इसे भी POST होना चाहिए या ध्यान से हैंडल करना चाहिए
  // FrontEnd code में apiRequest GET था, अगर इसे बनाए रखना है तो server पर GET route बनाएँ।
  // लेकिन Auth token के साथ data fetch करने के लिए POST method ज्यादा सुरक्षित होती है।
  // app.get("/api/delivery/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  //   try {
  //     if (!req.user) {
  //       return res.status(401).json({ message: "Unauthorized: No token provided." });
  //     }
  //     const deliveryBoy = await storage.getDeliveryBoyByFirebaseUid(req.user.uid);
  //     if (!deliveryBoy) {
  //       return res.status(404).json({ message: "Delivery boy not found." });
  //     }
  //     res.json({ user: deliveryBoy });
  //   } catch (error) {
  //     console.error("Error fetching delivery boy details:", error);
  //     res.status(500).json({ message: "Failed to fetch delivery boy details." });
  //   }
  // });


  // --- बाकी के API रूट्स (मौजूदा) ---
  app.get("/api/categories", async (req, res) => { /* ... */ });
  app.get("/api/products", async (req, res) => { /* ... */ });
  app.get("/api/products/:id", async (req, res) => { /* ... */ });
  app.get("/api/cart", async (req, res) => { /* ... */ });
  app.post("/api/cart", async (req, res) => { /* ... */ });
  app.put("/api/cart/:id", async (req, res) => { /* ... */ });
  app.delete("/api/cart/:id", async (req, res) => { /* ... */ });
  app.delete("/api/cart", async (req, res) => { /* ... */ });
  app.post("/api/orders", async (req, res) => { /* ... */ });
  app.get("/api/orders", async (req, res) => { /* ... */ });
  app.get("/api/orders/:id", async (req, res) => { /* ... */ });
  app.get("/api/products/:id/reviews", async (req, res) => { /* ... */ });
  app.post("/api/products/:id/reviews", async (req, res) => { /* ... */ });
}
