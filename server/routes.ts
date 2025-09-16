import express, { Router, Request, Response } from "express";
import { db } from "./db.ts";
import {
  users,
  products,
  categories,
  deliveryBoys,
  userRoleEnum,
  approvalStatusEnum,
  sellersPgTable,
} from "../shared/backend/schema.ts";
import { AuthenticatedRequest } from "./middleware/verifyToken.ts";
import { requireAuth, requireAdminAuth } from "./middleware/authMiddleware.ts";
import { authAdmin } from "./lib/firebaseAdmin.ts";
import { eq } from "drizzle-orm";

// ✅ Socket instance
import { getIO } from "./socket.ts";

// ✅ Sub-route modules
import orderRoutes from "../routes/orderRoutes";
import apiAuthLoginRouter from "./roots/apiAuthLogin.ts";
import adminApproveProductRoutes from "./roots/admin/approve-product.ts";
import adminRejectProductRoutes from "./roots/admin/reject-product.ts";
import adminProductsRoutes from "./roots/admin/products.ts";
import adminVendorsRoutes from "./roots/admin/vendors.ts";
import adminPasswordRoutes from "./roots/admin/admin-password.ts";
import sellerRouter from "../routes/sellers/sellerRoutes.ts";
import productsRouter from "../routes/productRoutes.ts";
import cartRouter from "../routes/cartRoutes.ts";
import dBoyRouter from "../routes/dBoyRoutes.ts";
import admindBoyRouter from "./roots/admin/admindBoyRoutes.ts";
import orderConfirmationRouter from "../routes/orderConfirmationRouter";

import userLoginRouter from "../routes/userRoutes.ts";
import { verifyToken } from "./middleware/verifyToken";

const router = Router();

// ✅ Health Check
router.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "API is running" });
});

router.get("/health", (req: Request, res: Response) => {
  res
    .status(200)
    .json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ Register User
router.post("/register", async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    if (!userData.firebaseUid || !userData.email) {
      return res
        .status(400)
        .json({ error: "Firebase UID and email are required." });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        firebaseUid: userData.firebaseUid,
        email: userData.email,
        name: userData.name || null,
        role: userRoleEnum.enumValues[0],
        approvalStatus: approvalStatusEnum.enumValues[1],
        password: userData.password || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
        address: userData.address || "",
        city: userData.city || "",
        pincode: userData.pincode || "",
      })
      .returning();

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("User registration failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// ✅ User Profile

router.get(
  "/users/me",
  requireAuth, // यह मिडलवेयर सुनिश्चित करता है कि उपयोगकर्ता मौजूद है।
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userUuid = req.user?.firebaseUid;
      if (!userUuid) {
        return res.status(401).json({ error: "Not authenticated." });
      }

      // ✅ केवल उपयोगकर्ता को खोजें, बनाएँ नहीं
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, userUuid));

      if (!user) {
        // यह स्थिति आदर्श नहीं है, लेकिन अगर ऐसा होता है तो 404 दें
        return res.status(404).json({ error: "User not found." });
      }

      // ✅ उपयोगकर्ता की भूमिका के आधार पर अतिरिक्त जानकारी जोड़ें
      let sellerInfo;
      if (user.role === "seller") {
        const [record] = await db
          .select({
            id: sellersPgTable.id,
            userId: sellersPgTable.userId,
            businessName: sellersPgTable.businessName,
            approvalStatus: sellersPgTable.approvalStatus,
            rejectionReason: sellersPgTable.rejectionReason,
          })
          .from(sellersPgTable)
          .where(eq(sellersPgTable.userId, user.id));

        if (record) sellerInfo = record;
      }

      res.status(200).json({ ...user, sellerProfile: sellerInfo || null });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Internal error." });
    }
  }
);
// ✅ Route 2: नए उपयोगकर्ता को लॉगिन और प्रोफ़ाइल बनाने के लिए

router.post("/auth/initial-login", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Firebase ID token is required." });
    }

    // Firebase टोकन को सत्यापित करें
    const decodedToken = await authAdmin.auth().verifyIdToken(idToken);
    const userUuid = decodedToken.uid;

    // ✅ डेटाबेस में उपयोगकर्ता को खोजें या बनाएँ
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, userUuid));

    if (!user) {
      console.log(`New user detected. Creating profile for Firebase UID: ${userUuid}`);
      const [newUser] = await db.insert(users).values({
        firebaseUid: userUuid,
        role: 'user', 
      }).returning();
      
      user = newUser;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    console.error("Initial login failed:", error);
    res.status(401).json({ message: "Authentication failed. Please try again." });
  }
});


// ✅ Logout
router.post("/auth/logout", async (req, res) => {
  const sessionCookie = req.cookies?.__session || "";
  res.clearCookie("__session");

  try {
    if (sessionCookie) {
      const decoded = await authAdmin
        .auth()
        .verifySessionCookie(sessionCookie);
      await authAdmin.auth().revokeRefreshTokens(decoded.sub);
    }
    res.status(200).json({ message: "Logged out successfully!" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Logout failed." });
  }
});

// ✅ Routes mapping
router.use("/users", userLoginRouter);
router.use("/auth", apiAuthLoginRouter);

// Seller-specific
router.use("/cart", cartRouter);
router.use("/orders", orderRoutes);
router.use("/order-confirmation", orderConfirmationRouter);
router.use("/sellers", verifyToken, sellerRouter);

// ✅ Categories
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categoriesList = await db.select().from(categories);
    res.status(200).json(categoriesList);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Internal error." });
  }
});

// ✅ Products
router.use("/products", productsRouter);

// ✅ Delivery Boy
router.use("/delivery", dBoyRouter);


// ✅ Admin Routes
const adminRouter = Router();
adminRouter.use(requireAdminAuth);
adminRouter.use("/products/approve", adminApproveProductRoutes);
adminRouter.use("/products/reject", adminRejectProductRoutes);
adminRouter.use("/products", adminProductsRoutes);
adminRouter.use("/password", adminPasswordRoutes);
adminRouter.use("/vendors", adminVendorsRoutes);
adminRouter.use("/delivery-boys", admindBoyRouter);
// ❌ /orders राउट को हटा दिया क्योंकि इसकी कोई फ़ाइल नहीं है
// adminRouter.use("/orders", dBoyRouter);


router.use("/admin", adminRouter);


export default router;
