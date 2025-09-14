// server/middleware/authMiddleware.ts
import { Response, NextFunction } from "express";
import { verifyToken, AuthenticatedRequest } from "./verifyToken";
import { userRoleEnum, deliveryBoys } from "../../shared/backend/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

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

export const requireDeliveryBoyAuth = [
  ...requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log("🔍 [requireDeliveryBoyAuth] User in middleware:", req.user);

      if (!req.user || req.user.role !== userRoleEnum.enumValues[3]) {
        return res
          .status(403)
          .json({ message: "Forbidden: Not a delivery boy." });
      }

      // ✅ Drizzle v0.30+ में eq/and functions यूज़ करना होगा
      const deliveryBoy = await db.query.deliveryBoys.findFirst({
        where: and(
          eq(deliveryBoys.userId, req.user.id),
          eq(deliveryBoys.approvalStatus, "approved")
        ),
      });

      console.log("🔍 Delivery boy record:", deliveryBoy);

      if (!deliveryBoy) {
        return res.status(403).json({
          message: "Forbidden: Delivery boy not approved or not found.",
        });
      }

      req.user.deliveryBoyId = deliveryBoy.id;
      next();
    } catch (err) {
      console.error("❌ requireDeliveryBoyAuth crashed:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
