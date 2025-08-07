// routes/sellers/sellerRoutes.ts
import { Router, Response } from 'express';
import { db } from '../../server/db.ts';
import { sellersPgTable, users } from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest,verifyToken } from '../../server/middleware/verifyToken.ts';
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


 // ✅ POST /api/sellers/apply
 
router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Received seller apply data:', req.body);
    
    const firebaseUid = req.user?.firebaseUid; 
    if (!firebaseUid) return res.status(401).json({ message: "Unauthorized" });

    const {
      businessName,
      businessAddress,
      businessPhone,
      description,
      city,
      pincode,
      gstNumber,
      bankAccountNumber,
      ifscCode,
      deliveryRadius,
      businessType,
    } = req.body;

    if (!businessName || !businessPhone || !city || !pincode || !businessAddress || !businessType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    if (!dbUser) return res.status(404).json({ message: "User not found." });

    const [existing] = await db.select().from(sellersPgTable).where(eq(sellersPgTable.userId, dbUser.id));
    if (existing) {
      return res.status(400).json({
        message: "Application already submitted.",
        status: existing.approvalStatus,
      });
    }

    const newSeller = await db.insert(sellersPgTable).values({
      userId: dbUser.id,
      businessName,
      businessAddress,
      businessPhone,
      description: description || null,
      city,
      pincode,
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null,
      ifscCode: ifscCode || null,
      deliveryRadius: deliveryRadius ? parseInt(String(deliveryRadius)) : null,
      businessType,
      approvalStatus: approvalStatusEnum.enumValues[0],
      applicationDate: new Date(),
    }).returning();

    const [updatedUser] = await db.update(users)
      .set({
        role: userRoleEnum.enumValues[1],
        approvalStatus: approvalStatusEnum.enumValues[0],
      })
      .where(eq(users.id, dbUser.id))
      .returning();

    return res.status(201).json({
      message: "Application submitted.",
      seller: newSeller[0],
      user: {
        firebaseUid: updatedUser.firebaseUid,
        role: updatedUser.role,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in apply.ts:", error);
    next(error);
  }
});


export default sellerRouter;
