import { Router, Response, NextFunction } from 'express';
import { db } from '../../db.ts';
import {
  deliveryBoys,
  users,
} from '../../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';

const router = Router();

router.use(requireAdminAuth);

// ✅ PATCH /admin/delivery-boys/approve/:id
router.patch("/approve/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const deliveryBoyId = Number(req.params.id);
    const [approvedBoy] = await db.update(deliveryBoys)
      .set({ approvalStatus: "approved" })
      .where(eq(deliveryBoys.id, deliveryBoyId))
      .returning();

    if (!approvedBoy) {
      return res.status(404).json({ error: "Delivery boy not found." });
    }

    // ✅ users टेबल को भी अपडेट करें
    const [updatedUser] = await db.update(users)
      .set({ approvalStatus: "approved" })
      .where(eq(users.id, approvedBoy.userId))
      .returning();

    return res.status(200).json({ approvedBoy, updatedUser });
  } catch (error: any) {
    console.error("❌ Error approving delivery boy:", error);
    next(error);
  }
});

// ✅ PATCH /admin/delivery-boys/reject/:id
router.patch("/reject/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const deliveryBoyId = Number(req.params.id);
    const [rejectedBoy] = await db.update(deliveryBoys)
      .set({ approvalStatus: "rejected" })
      .where(eq(deliveryBoys.id, deliveryBoyId))
      .returning();

    if (!rejectedBoy) {
      return res.status(404).json({ error: "Delivery boy not found." });
    }

    // ✅ users टेबल को भी अपडेट करें
    const [updatedUser] = await db.update(users)
      .set({ approvalStatus: "rejected" })
      .where(eq(users.id, rejectedBoy.userId))
      .returning();

    return res.status(200).json({ rejectedBoy, updatedUser });
  } catch (error: any) {
    console.error("❌ Error rejecting delivery boy:", error);
    next(error);
  }
});

export default router;
