// routes/sellers/sellerRoutes.ts
import { Router, Response } from 'express';
import { db } from '../../server/db.ts';
import { sellersPgTable, users } from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest } from '../../server/middleware/verifyToken.ts';
import { eq } from 'drizzle-orm';

const sellerRouter = Router();

/**
 * ✅ GET /api/sellers/me
 * Authenticated route to get the current seller profile
 */
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ✅ यहाँ uuid की जगह firebaseUid का उपयोग करें
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: Missing user UUID' });
    }

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      // ✅ यहाँ users.uuid की जगह users.firebaseUid का उपयोग करें
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [seller] = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, dbUser.id));

    if (!seller) {
      return res.status(404).json({ message: 'Seller profile not found.' });
    }

    return res.status(200).json(seller);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/me:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * ✅ POST /api/sellers/apply
 * Apply as a seller (requires auth)
 */
sellerRouter.post('/apply', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // ✅ यहाँ userUuid की जगह firebaseUid का उपयोग करें
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) return res.status(401).json({ error: 'Unauthorized' });

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      // ✅ यहाँ users.uuid की जगह users.firebaseUid का उपयोग करें
      .where(eq(users.firebaseUid, firebaseUid));

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [existing] = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, dbUser.id));

    if (existing) {
      return res.status(400).json({ error: 'Seller already exists.' });
    }

    await db.insert(sellersPgTable).values({
      userId: dbUser.id,
      businessName: req.body.businessName,
      address: req.body.address,
      phone: req.body.phone,
      approvalStatus: 'pending',
    });

    return res.status(200).json({ message: 'Seller application submitted.' });
  } catch (error: any) {
    console.error('❌ Error in POST /api/sellers/apply:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default sellerRouter;
