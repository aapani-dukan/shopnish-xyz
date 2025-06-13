import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers } from "../../shared/backend/schema";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    const existingSeller = await db.query.sellers.findFirst({
      where: sellers.id.eq(sellerId),
    });

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // Update seller approval status to approved
    const updatedSeller = await db
      .update(sellers)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
      })
      .where(sellers.id.eq(sellerId))
      .returning();

    res.json(updatedSeller);
  } catch (error) {
    next(error);
  }
});

export default router;
