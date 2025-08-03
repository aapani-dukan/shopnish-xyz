// routs/sellers/sellerRoutes.ts

import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db.ts';
import { sellersPgTable, users, approvalStatusEnum, userRoleEnum } from '../../shared/backend/schema.ts';
import { requireAuth, requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest } from '../../server/middleware/verifyToken.ts ';

const sellerRouter = Router();

// POST /api/sellers/apply
sellerRouter.post('/apply', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid;

    if (!userUuid) return res.status(401).json({ error: 'User not authenticated or UUID missing.' });

    const [dbUser] = await db
      .select({ id: users.id, role: users.role, approvalStatus: users.approvalStatus })
      .from(users)
      .where(eq(users.uuid, userUuid));

    if (!dbUser) return res.status(404).json({ error: 'User not found in database for application.' });

    const [existingSeller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (existingSeller) {
      const status = existingSeller.approvalStatus;
      const messages = {
        pending: 'Your application is pending.',
        approved: 'You are already an approved seller.',
        rejected: 'Application rejected. Contact support.',
      };
      return res.status(200).json({ message: messages[status], sellerProfile: existingSeller });
    }

    const sellerData = {
      ...req.body,
      userId: dbUser.id,
      approvalStatus: approvalStatusEnum.enumValues[0],
      applicationDate: new Date(),
    };

    const [newSeller] = await db.insert(sellersPgTable).values(sellerData).returning();

    await db.update(users)
      .set({
        role: userRoleEnum.enumValues[1],
        approvalStatus: approvalStatusEnum.enumValues[0],
      })
      .where(eq(users.id, dbUser.id));

    res.status(201).json({
      message: 'Seller application submitted successfully!',
      sellerProfile: newSeller,
    });
  } catch (error: any) {
    console.error('Seller application error:', error);
    res.status(500).json({ error: 'Internal server error during seller application.' });
  }
});

// GET /api/seller/me
sellerRouter.get('/me', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return res.status(401).json({ error: 'User not authenticated or UUID missing.' });

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.uuid, userUuid));
    if (!dbUser) return res.status(404).json({ error: 'User not found.' });

    const [seller] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (!seller) return res.status(404).json({ message: 'Seller profile not found for this user.' });

    res.status(200).json(seller);
  } catch (error: any) {
    console.error('Fetch seller profile error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default sellerRouter;
