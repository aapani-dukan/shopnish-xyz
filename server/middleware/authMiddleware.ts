// server/middleware/authMiddleware.ts
import { Response, NextFunction } from "express";
import { verifyToken, AuthenticatedRequest } from "./verifyToken";
import { userRoleEnum, deliveryBoys } from "../../shared/backend/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

// सामान्य प्रमाणीकरण
export const requireAuth = [
  verifyToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: Authentication required.",
      });
    }
    next();
  },
];

// केवल Admin के लिए
export const requireAdminAuth = [
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== userRoleEnum.enumValues[2]) {
      // ✅ admin
      return res.status(403).json({
        message: "Forbidden: Admin access required.",
      });
    }
    next();
  },
];

// केवल Seller के लिए
export const requireSellerAuth = [
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== userRoleEnum.enumValues[1]) {
      // ✅ seller
      return res.status(403).json({
        message: "Forbidden: Seller access required.",
      });
    }
    next();
  },
];

// केवल Delivery Boy के लिए
export const requireDeliveryBoyAuth = [
  ...requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("🔍 [requireDeliveryBoyAuth] User:", req.user);

    if (!req.user || req.user.role !== userRoleEnum.enumValues[3]) {
      // ✅ delivery-boy
      return res.status(403).json({ message: "Forbidden: Not a delivery boy." });
    }

    req.user.sellerId = sellerProfile.id;
    // DB से deliveryBoy record fetch करें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: and(
        eq(deliveryBoys.userId, req.user.id),
        eq(deliveryBoys.approvalStatus, "approved")
      ),
    });

    if (!deliveryBoy) {
      return res.status(403).json({
        message: "Forbidden: Delivery boy not approved or not found.",
      });
    }

    // req.user में deliveryBoyId attach करें
    req.user.deliveryBoyId = deliveryBoy.id;

    next();
  },
];
