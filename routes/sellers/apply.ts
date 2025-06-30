import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.user?.userId;

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
      businessType,
    } = req.body;

    if (!businessName || !businessPhone || !city || !pincode || !businessAddress || !businessType) {
      return res.status(400).json({ message: "Missing required seller details." });
    }

    // 🔍 Check if seller already exists
    const existingSellerResult = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, firebaseUid))
      .limit(1);

    const existingSeller = existingSellerResult[0];

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller.approvalStatus,
      });
    }

    // 📝 Prepare insert data
    const insertData = {
      userId: firebaseUid,
      businessName,
      businessAddress,
      businessPhone,
      businessType,
      description: description || null,
      city,
      pincode,
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null,
      ifscCode: ifscCode || null,
      deliveryRadius: deliveryRadius ? parseInt(String(deliveryRadius)) : null,
      approvalStatus: "pending" as const,
    };

    const newSellerResult = await db
      .insert(sellersPgTable)
      .values(insertData)
      .returning();

    const newSeller = newSellerResult[0];

    // ✅ Fix: Set role to "pending_seller"
    const updatedUserResult = await db
      .update(users)
      .set({ role: "pending_seller" })
      .where(eq(users.firebaseUid, firebaseUid))
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
      console.error("❌ Could not update user role for firebaseUid:", firebaseUid);
      return res.status(500).json({ message: "Failed to update user role." });
    }

    return res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller,
      user: {
        uuid: updatedUser.firebaseUid,
        role: updatedUser.role,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("❌ Error in seller apply route:", error);
    next(error);
  }
});

export default router;
