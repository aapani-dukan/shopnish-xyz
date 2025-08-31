import { Router, Response } from 'express';
import { db } from '../../server/db';
import { sellersPgTable, users, approvalStatusEnum } from '../../shared/backend/schema';
import { AuthenticatedRequest } from '../../server/middleware/verifyToken';
import { eq } from 'drizzle-orm';
import { requireAdminAuth } from '../../server/middleware/authMiddleware';

const router = Router();

// ✅ GET /api/admin/vendors/pending
router.get('/pending', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await db.query.sellersPgTable.findMany({
      where: eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[0]),
    });
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error('Failed to fetch pending sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ✅ GET /api/admin/vendors/approved
router.get('/approved', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const approvedSellers = await db.query.sellersPgTable.findMany({
      where: eq(sellersPgTable.approvalStatus, approvalStatusEnum.enumValues[1]),
    });
    res.status(200).json(approvedSellers);
  } catch (error: any) {
    console.error('Failed to fetch approved sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ✅ PATCH /api/admin/vendors/approve/:id
router.patch("/approve/:id", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = Number(req.params.id);
    if (isNaN(sellerId)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const seller = await db.query.sellersPgTable.findFirst({
      where: (fields, { eq }) => eq(fields.id, sellerId),
    });

    if (!seller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    const [approved] = await db
      .update(sellersPgTable)
      .set({ approvalStatus: "approved", approvedAt: new Date() })
      .where(eq(sellersPgTable.id, sellerId))
      .returning();

    // साथ ही यूज़र की भूमिका (role) को 'seller' में अपडेट करें
    await db.update(users)
      .set({ role: 'seller' })
      .where(eq(users.firebaseUid, seller.userId));

    res.status(200).json({
      message: "Seller approved successfully.",
      seller: approved,
    });
  } catch (error: any) {
    console.error("Failed to approve seller:", error);
    res.status(500).json({ message: "Failed to approve seller." });
  }
});

// ✅ PATCH /api/admin/vendors/reject/:id
router.patch("/reject/:id", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sellerId = Number(req.params.id);
    if (isNaN(sellerId)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const product = await db.query.sellersPgTable.findFirst({
      where: (fields, { eq }) => eq(fields.id, sellerId),
    });

    if (!product) {
      return res.status(404).json({ message: "Seller not found." });
    }

    const [rejected] = await db
      .update(sellersPgTable)
      .set({ approvalStatus: "rejected" })
      .where(eq(sellersPgTable.id, sellerId))
      .returning();

    res.status(200).json({
      message: "Seller rejected successfully.",
      seller: rejected,
    });
  } catch (error: any) {
    console.error("Failed to reject seller:", error);
    res.status(500).json({ message: "Failed to reject seller." });
  }
});

export default router;
