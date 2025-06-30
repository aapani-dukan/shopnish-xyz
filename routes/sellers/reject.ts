import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm"; 

const router = Router();

// ✅ Admin Check Middleware
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

// 🚫 Reject Seller Endpoint
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId, reason } = req.body;

    if (typeof sellerId !== "number" || sellerId <= 0 || !reason || typeof reason !== "string" || reason.trim() === "") {
      return res.status(400).json({ message: "A valid sellerId (number) and a non-empty reason (string) are required." });
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
      return res.status(400).json({ message: "Seller is already approved and cannot be rejected." });
    }

    if (existingSeller.approvalStatus === "rejected") {
      console.log(`Seller with ID ${sellerId} is already rejected. Updating rejection reason.`);
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

    const updatedUser = updatedUserResult.length > 0 ? updatedUserResult[0] : undefined;

    if (!updatedUser) {
      console.error("Seller reject: Could not find user to update role for firebaseUid:", existingSeller.userId);
      // Optional: res.status(500) कर सकते हैं अगर critical मानें
    }

    res.json({
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
    console.error("Error in seller reject route:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
