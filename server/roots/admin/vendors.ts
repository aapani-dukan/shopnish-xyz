import { Router, Response } from 'express';
import { storage } from '../../storage.ts';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';
import { approvalStatusEnum } from '../../../shared/backend/schema.ts';

const router = Router();

// ✅ अब URL /api/admin/vendors/pending होगा
router.get('/pending', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingSellers = await storage.getSellers(approvalStatusEnum.enumValues[0]);
    res.status(200).json(pendingSellers);
  } catch (error: any) {
    console.error('Failed to fetch pending sellers:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ✅ अब URL /api/admin/vendors/:sellerId/approve होगा
router.patch('/:sellerId/approve', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  if (isNaN(sellerId)) {
    return res.status(400).json({ error: 'Invalid seller ID.' });
  }

  try {
    const updatedSeller = await storage.updateSellerStatus(sellerId, approvalStatusEnum.enumValues[1]);
    if (!updatedSeller) {
      return res.status(404).json({ error: 'Seller not found or update failed.' });
    }
    res.status(200).json({ message: 'Seller approved successfully.', seller: updatedSeller });
  } catch (error: any) {
    console.error('Failed to approve seller:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ✅ अब URL /api/admin/vendors/:sellerId/reject होगा
router.patch('/:sellerId/reject', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  const sellerId = parseInt(req.params.sellerId);
  const { reason } = req.body;
  if (isNaN(sellerId)) {
    return res.status(400).json({ error: 'Invalid seller ID.' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  try {
    const updatedSeller = await storage.updateSellerStatus(sellerId, approvalStatusEnum.enumValues[2], reason);
    if (!updatedSeller) {
      return res.status(404).json({ error: 'Seller not found or update failed.' });
    }
    res.status(200).json({ message: 'Seller rejected successfully.', seller: updatedSeller });
  } catch (error: any) {
    console.error('Failed to reject seller:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
