// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    // 1. Find the seller
    const existingSeller = await db.query.sellers.findFirst({
      where: sellers.id.eq(sellerId),
    });

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 2. Approve the seller
    const updatedSeller = await db
      .update(sellers)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
      })
      .where(sellers.id.eq(sellerId))
      .returning();

    // 3. Update user role to "seller"
    await db
      .update(users)
      .set({ role: "seller" })
      .where(users.firebaseUid.eq(existingSeller.firebaseUid));

    res.json({
      message: "Seller approved and role updated to 'seller'",
      seller: updatedSeller,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
