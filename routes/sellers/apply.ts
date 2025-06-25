// routes/sellers/apply.ts

import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema"; // users को भी सही से इंपोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated." });
    }

    // ✅ सबसे पहले, Firebase UID का उपयोग करके users टेबल से यूजर की संख्यात्मक ID प्राप्त करें
    const userInDb = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);

    if (!userInDb || userInDb.length === 0) {
        return res.status(404).json({ message: "User not found in internal database." });
    }

    const userId = userInDb[0].id; // ✅ यह अब users टेबल की संख्यात्मक ID है!

    console.log("Incoming request body for seller apply:", req.body);

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

    // अनिवार्य फ़ील्ड्स की जाँच करें
    if (!businessName || !businessPhone || !city || !pincode || !businessAddress || !businessType) {
      return res.status(400).json({ message: "Missing required seller details." });
    }

    /* ─────────── 4. पहले से आवेदन या approve तो नहीं? ─────────── */
    const existingSellerResult = await db.select()
                                   .from(sellersPgTable)
                                   .where(eq(sellersPgTable.userId, userId)) // ✅ यहाँ संख्यात्मक userId का उपयोग करें
                                   .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : undefined;

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller.approvalStatus,
      });
    }

    /* ─────────── 5. नया आवेदन create करें (status: pending) ─────────── */
    const insertData = {
      userId: userId, // ✅ यहाँ संख्यात्मक userId का उपयोग करें
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessType: businessType,
      description: description || null,
      city: city,
      pincode: pincode,
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null,
      ifscCode: ifscCode || null,
      deliveryRadius: deliveryRadius ? parseInt(String(deliveryRadius)) : null,
      approvalStatus: "pending",
    };

    console.log("Seller data prepared for insertion:", insertData);

    const newSellerResult = await db
      .insert(sellersPgTable)
      .values(insertData)
      .returning();

    const newSeller = newSellerResult[0];

    /* ─────────── 6. उसी user की role = seller और approvalStatus = pending कर दें ─────────── */
    // इसे 'seller' पर सेट करें, 'pending_seller' नहीं
    // और approvalStatus को 'pending' पर सेट करें
    const updatedUserResult = await db
      .update(users)
      .set({
        role: "seller", // ✅ रोल 'seller'
        approvalStatus: "pending", // ✅ स्टेटस 'pending'
      })
      .where(eq(users.id, userId)) // ✅ यहाँ users.id का उपयोग करें (संख्यात्मक ID)
      .returning();

    const updatedUser = updatedUserResult[0];

    if (!updatedUser) {
        console.error("Seller apply: Could not find user to update role for userId:", userId);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    /* ─────────── 7. सक्सेस रिस्पॉन्स भेजें ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller,
      user: {
          uuid: updatedUser.id.toString(), // ✅ यहाँ संख्यात्मक ID को string में कन्वर्ट करके भेजें
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
          approvalStatus: updatedUser.approvalStatus, // ✅ अप्रूवल स्टेटस भी भेजें
      },
    });
  } catch (error) {
    console.error("Error in seller apply route:", error);
    next(error);
  }
});

export default router;
