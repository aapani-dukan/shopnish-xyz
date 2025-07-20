// routes/sellers/approve.ts

import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db.ts";
import { sellersPgTable, users } from "../../shared/backend/schema.ts"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken.ts";
import { eq } from "drizzle-orm";

const router = Router();

// 🔐 Admin-only Middleware
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.userId)) // 🧠 Cross-check field name
      .limit(1);

    const user = userResult[0];

    if (user?.role === "admin") {
      return next();
    } else {
      return res.status(403).json({ message: "Forbidden: Not an admin." });
    }
  } catch (error) {
    console.error("❌ Error checking admin role:", error);
    return res.status(500).json({ message: "Internal server error during role check." });
  }
};

// ✅ Seller Approval Route
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (typeof sellerId !== "number" || sellerId <= 0) {
      return res.status(400).json({ message: "Invalid sellerId. It must be a positive number." });
    }

    const sellerResult = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.id, sellerId))
      .limit(1);

    const seller = sellerResult[0];

    if (!seller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    if (seller.approvalStatus === "approved") {
      return res.status(400).json({ message: "Seller is already approved." });
    }

    if (seller.approvalStatus === "rejected") {
      return res.status(400).json({
        message: "Seller was previously rejected. Cannot approve directly. Please review.",
      });
    }

    // ✅ Approve seller
    const updatedSellerResult = await db
      .update(sellersPgTable)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(sellersPgTable.id, sellerId))
      .returning();

    const updatedSeller = updatedSellerResult[0];

    // ✅ Update user role to "seller"
    const updatedUserResult = await db
      .update(users)
      .set({ role: "seller", updatedAt: new Date() })
      .where(eq(users.firebaseUid, seller.userId)) // 👈 Confirm this field is `firebaseUid`
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
      console.error("❌ Could not update user role. Firebase UID:", seller.userId);
      return res.status(500).json({ message: "Failed to update user role." });
    }

    return res.status(200).json({
      message: "Seller approved successfully",
      seller: updatedSeller,
      user: {
        firebaseUid: updatedUser.firebaseUid,
        role: updatedUser.role,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in seller approval route:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
});

export default router;
