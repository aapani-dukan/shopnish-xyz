import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db.ts";
import { sellersPgTable, users } from "../../shared/backend/schema.ts";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken.ts";
import { eq } from "drizzle-orm";

const router = Router();

// 🔐 Admin-only middleware
const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: Missing user ID" });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.userId))
      .limit(1);

    const user = userResult[0];

    if (user?.role === "admin") return next();

    return res.status(403).json({ message: "Forbidden: Admin access required" });
  } catch (error) {
    console.error("❌ Error checking admin role:", error);
    return res.status(500).json({ message: "Internal server error during role check" });
  }
};

// ❌ Reject Seller Application
router.post(
  "/",
  verifyToken,
  isAdmin,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sellerId, reason } = req.body;

      if (
        typeof sellerId !== "number" ||
        sellerId <= 0 ||
        !reason ||
        typeof reason !== "string" ||
        reason.trim() === ""
      ) {
        return res.status(400).json({
          message: "A valid sellerId (number) and non-empty reason (string) are required.",
        });
      }

      const existingSellerResult = await db
        .select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.id, sellerId))
        .limit(1);

      const existingSeller = existingSellerResult[0];

      if (!existingSeller) {
        return res.status(404).json({ message: "Seller not found." });
      }

      if (existingSeller.approvalStatus === "approved") {
        return res
          .status(400)
          .json({ message: "Seller is already approved and cannot be rejected." });
      }

      if (existingSeller.approvalStatus === "rejected") {
        console.log(`⚠️ Seller ID ${sellerId} already rejected. Updating reason.`);
      }

      const updatedSellerResult = await db
        .update(sellersPgTable)
        .set({
          approvalStatus: "rejected" as const,
          rejectionReason: reason,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(sellersPgTable.id, sellerId))
        .returning();

      const updatedSeller = updatedSellerResult[0];

      const updatedUserResult = await db
        .update(users)
        .set({ role: "customer", updatedAt: new Date() })
        .where(eq(users.firebaseUid, existingSeller.userId))
        .returning();

      const updatedUser = updatedUserResult[0];

      if (!updatedUser) {
        console.warn("⚠️ Could not update user role for rejected seller:", existingSeller.userId);
      }

      return res.status(200).json({
        message: "Seller application rejected.",
        seller: updatedSeller,
        user: updatedUser
          ? {
              firebaseUid: updatedUser.firebaseUid,
              role: updatedUser.role,
              email: updatedUser.email,
              name: updatedUser.name,
            }
          : undefined,
      });
    } catch (error) {
      console.error("❌ Error in seller reject route:", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: (error as Error).message });
    }
  }
);

export default router;
