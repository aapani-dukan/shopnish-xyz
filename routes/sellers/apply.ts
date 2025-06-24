// routes/sellers/apply.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Endpoint for a user to apply as a seller.
 * Requires authentication via verifyToken middleware.
 */
router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated." });
    }

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
      businessType 
    } = req.body;

    if (!businessName || !businessPhone || !city || !pincode || !businessAddress) {
      return res.status(400).json({ message: "Missing required seller details." });
    }

    /* ─────────── 4. Check for existing or approved application ─────────── */
    const existingSellerResult = await db.select()
                                   .from(sellers)
                                   .where(eq(sellers.userId, firebaseUid))
                                   .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : undefined;

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller.approvalStatus,
      });
    }

    /* ─────────── 5. Create new application (status: pending) ─────────── */
    // ✅ यहाँ Date ऑब्जेक्ट्स को ISO स्ट्रिंग में बदला गया है
    const newSellerResult = await db
      .insert(sellers)
      .values({
        userId: firebaseUid,
        businessName,
        businessAddress,
        businessPhone,
        businessType,
        description,
        city,
        pincode,
        gstNumber,
        bankAccountNumber,
        ifscCode,
        deliveryRadius,
        approvalStatus: "pending",
        appliedAt: new Date().toISOString(), // ⚠️ ISO स्ट्रिंग में बदलें
        createdAt: new Date().toISOString(),   // ⚠️ ISO स्ट्रिंग में बदलें
        updatedAt: new Date().toISOString(),   // ⚠️ ISO स्ट्रिंग में बदलें
      })
      .returning();

    const newSeller = newSellerResult[0];

    /* ─────────── 6. Update user role to pending_seller ─────────── */
    // ✅ यहाँ भी Date ऑब्जेक्ट को ISO स्ट्रिंग में बदला गया है
    const updatedUserResult = await db
      .update(users)
      .set({ role: "pending_seller", updatedAt: new Date().toISOString() }) // ⚠️ ISO स्ट्रिंग में बदलें
      .where(eq(users.firebaseUid, firebaseUid))
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
        console.error("Seller apply: Could not find user to update role for firebaseUid:", firebaseUid);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    /* ─────────── 7. Send success response ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller,
      user: {
          uuid: updatedUser.uuid,
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error in seller apply route:", error);
    // ✅ एरर को NextFunction को पास करें ताकि ग्लोबल एरर हैंडलर इसे पकड़ सके
    next(error); 
  }
});

export default router;
