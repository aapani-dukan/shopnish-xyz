// routes/sellers/apply.ts

import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ message: "Unauthorized: Missing user info." });
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

    const insertData = {
      userId: firebaseUid,
      businessName,
      businessAddress,
      businessPhone,
      businessType: businessType?.trim() || null,
      description: description?.trim() || null,
      city,
      pincode,
      gstNumber: gstNumber?.trim() || null,
      bankAccountNumber: bankAccountNumber?.trim() || null,
      ifscCode: ifscCode?.trim() || null,
      deliveryRadius:
        typeof deliveryRadius === "string" && deliveryRadius.trim() !== ""
          ? parseInt(deliveryRadius)
          : null,
      approvalStatus: "pending",
    };

    console.log("Attempting to insert seller with data:", insertData);

    const newSellerResult = await db
      .insert(sellers)
      .values(insertData)
      .returning();

    const newSeller = newSellerResult[0];

    const updatedUserResult = await db
      .update(users)
      .set({ 
        role: "pending_seller",
      }) 
      .where(eq(users.firebaseUid, firebaseUid))
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
      console.error("Seller apply: Could not find user to update role for firebaseUid:", firebaseUid);
      return res.status(500).json({ message: "Failed to update user role." });
    }

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
    next(error);
  }
});

export default router;
