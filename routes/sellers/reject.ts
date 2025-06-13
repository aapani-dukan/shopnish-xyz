import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers } from "../../shared/backend/schema";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId, reason } = req.body;

    if (!sellerId || !reason) {
      return res.status(400).json({ message: "sellerId and reason are required" });
    }

    const existingSeller = await db.query.sellers.findFirst({
      where: sellers.id.eq(sellerId),
    });

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const updatedSeller = await db
      .update(sellers)
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason,
        approvedAt: null,
      })
      .where(sellers.id.eq(sellerId))
      .returning();

    res.json(updatedSeller);
  } catch (error) {
    next(error);
  }
});

export default router;
