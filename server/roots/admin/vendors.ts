import { Router, Response, NextFunction } from 'express';
import { db } from '../../db.ts';
import {
  sellersPgTable,
  users,
} from '../../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';

const router = Router();

router.use(requireAdminAuth);

// ✅ PATCH /admin/vendors/approve/:id
router.patch("/approve/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const vendorId = Number(req.params.id);
    const [approvedVendor] = await db.update(sellersPgTable)
      .set({ approvalStatus: "approved" })
      .where(eq(sellersPgTable.id, vendorId))
      .returning();

    if (!approvedVendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    // ✅ users टेबल को भी अपडेट करें
    const [updatedUser] = await db.update(users)
      .set({ approvalStatus: "approved" })
      .where(eq(users.id, approvedVendor.userId))
      .returning();

    return res.status(200).json({ approvedVendor, updatedUser });
  } catch (error: any) {
    console.error("❌ Error approving vendor:", error);
    next(error);
  }
});

// ✅ PATCH /admin/vendors/reject/:id
router.patch("/reject/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const vendorId = Number(req.params.id);
    const [rejectedVendor] = await db.update(sellersPgTable)
      .set({ approvalStatus: "rejected" })
      .where(eq(sellersPgTable.id, vendorId))
      .returning();

    if (!rejectedVendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    // ✅ users टेबल को भी अपडेट करें
    const [updatedUser] = await db.update(users)
      .set({ approvalStatus: "rejected" })
      .where(eq(users.id, rejectedVendor.userId))
      .returning();

    return res.status(200).json({ rejectedVendor, updatedUser });
  } catch (error: any) {
    console.error("❌ Error rejecting vendor:", error);
    next(error);
  }
});

export default router;
