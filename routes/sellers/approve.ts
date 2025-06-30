import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = Router();

// 🔐 Admin Middleware
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.userId))
      .limit(1);

    const user = userResult.length > 0 ? userResult[0] : null;

    if (user?.role === "admin") {
      next();
    } else {
      return res.status(403).json({ message: "Forbidden: Not an admin." });
    }
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ message: "Internal server error during role check." });
  }
};

// ✅ Approve Seller Endpoint
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (typeof sellerId !== "number" || sellerId <= 0) {
      return res.status(400).json({ message: "A valid sellerId (number) is required." });
    }

    const existingSellerResult = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.id, sellerId))
      .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : null;

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    if (existingSeller.approvalStatus === "approved") {
      return res.status(400).json({ message: "Seller is already approved." });
    }

    if (existingSeller.approvalStatus === "rejected") {
      return res.status(400).json({ message: "Seller was previously rejected. Cannot approve directly. Please review." });
    }

    const updatedSellerResult = await db
      .update(sellersPgTable)
      .set({
        approvalStatus: "approved" as const,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(sellersPgTable.id, sellerId))
      .returning();

    const updatedSeller = updatedSellerResult[0];

    const updatedUserResult = await db
      .update(users)
      .set({ role: "seller", updatedAt: new Date() })
      .where(eq(users.firebaseUid, existingSeller.userId))
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
      console.error("Seller approve: Could not find user to update role for firebaseUid:", existingSeller.userId);
      return res.status(500).json({ message: "Failed to update user role." });
    }

    res.json({
      message: "Seller approved and role updated to 'seller'",
      seller: updatedSeller,
      user: {
        firebaseUid: updatedUser.firebaseUid,
        role: updatedUser.role,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error in seller approve route:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
