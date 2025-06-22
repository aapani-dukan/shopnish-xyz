// routes/sellers/apply.ts
import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";

const router = Router();

/**
 * Body ⇒ { userId, businessName, businessAddress?, phoneNumber }
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, businessName, businessAddress, phoneNumber } = req.body;

    if (!userId || !businessName || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    /* ─────────── 1️⃣ पहले से आवेदन या approve तो नहीं? ─────────── */
    const existingSeller = await db.query.sellers.findFirst({
      where: sellers.userId.eq(userId),
    });

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
      });
    }

    /* ─────────── 2️⃣ नया आवेदन create (status: pending) ─────────── */
    const [newSeller] = await db
      .insert(sellers)
      .values({
        userId,
        businessName,
        businessAddress,
        phoneNumber,
        approvalStatus: "pending",
        appliedAt: new Date(),
      })
      .returning();

    /* ─────────── 3️⃣ उसी user की role = pending_seller कर दें ─────────── */
    const [updatedUser] = await db
      .update(users)
      .set({ role: "pending_seller" })
      .where(users.id.eq(userId))
      .returning();

    /* ─────────── 4️⃣ Done ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
