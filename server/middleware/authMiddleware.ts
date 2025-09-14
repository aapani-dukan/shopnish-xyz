// server/middleware/authMiddleware.ts
import { Response, NextFunction } from "express";
import { verifyToken, AuthenticatedRequest } from "./verifyToken.ts";
import { userRoleEnum } from "../../shared/backend/schema.ts";
import { db } from "../db"; // ✅ db import करना ज़रूरी है
import { deliveryBoys } from "@shared/backend/schema"; // ✅ deliveryBoys schema भी import करें

// सामान्य प्रमाणीकरण
export const requireAuth = [
  verifyToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Authentication required." });
    }
    next();
  },
];

// केवल Admin भूमिका वाले उपयोगकर्ताओं के लिए
export const requireAdminAuth = [
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[2]) {
      // 'admin'
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required." });
    }
    next();
  },
];

// केवल Seller भूमिका वाले उपयोगकर्ताओं के लिए
export const requireSellerAuth = [
  ...requireAuth,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[1]) {
      // 'seller'
      return res
        .status(403)
        .json({ message: "Forbidden: Seller access required." });
    }
    next();
  },
];

// केवल Delivery Boy भूमिका वाले उपयोगकर्ताओं के लिए
export const requireDeliveryBoyAuth = [
  ...requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log("🔍 [requireDeliveryBoyAuth] User in middleware:", req.user);

    if (!req.user || req.user.role !== userRoleEnum.enumValues[3]) {
      // 'delivery_boy'
      return res.status(403).json({ message: "Forbidden: Not a delivery boy." });
    }

    // Database से deliveryBoyId निकालें
    const deliveryBoy = await db.query.deliveryBoys.findFirst({
      where: (t) =>
        t.userId.eq(req.user.id).and(t.status.eq("approved")),
    });

    if (!deliveryBoy) {
      return res.status(403).json({
        message: "Forbidden: Delivery boy not approved or not found.",
      });
    }

    // ✅ अब req.user में deliveryBoyId add कर दो
    req.user.deliveryBoyId = deliveryBoy.id;

    next();
  },
];
