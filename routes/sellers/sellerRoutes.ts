// routes/sellers/sellerRoutes.ts
import { Router, Response } from 'express';
import { db } from '../../server/db.ts';
import { sellersPgTable, users } from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest } from '../../server/middleware/verifyToken.ts';
import { eq } from 'drizzle-orm';

const sellerRouter = Router();

// ✅ GET /api/sellers/me
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return res.status(401).json({ error: 'Unauthorized' });

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uuid, userUuid));
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (!seller) return res.status(404).json({ message: 'Seller profile not found.' });

    res.status(200).json(seller);
  } catch (error: any) {
    console.error('❌ Error in /me:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default sellerRouter;
