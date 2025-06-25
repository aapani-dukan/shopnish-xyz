// routes/sellers/apply.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
// ✅ sellersPgTable को इंपोर्ट करें, sellers Zod ऑब्जेक्ट को नहीं
import { sellersPgTable, users } from "../../shared/backend/schema"; 
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

    // ✅ यहाँ इनकमिंग रिक्वेस्ट बॉडी को लॉग करें - यह सबसे महत्वपूर्ण डीबग लॉग है!
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
      // businessType भी अनिवार्य है अगर Zod स्कीमा में min(1) है।
      return res.status(400).json({ message: "Missing required seller details." });
    }

    /* ─────────── 4. पहले से आवेदन या approve तो नहीं? ─────────── */
    const existingSellerResult = await db.select()
                                   .from(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
                                   .where(eq(sellersPgTable.userId, firebaseUid)) // ✅ sellersPgTable.userId का उपयोग करें
                                   .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : undefined;

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller.approvalStatus,
      });
    }

    /* ─────────── 5. नया आवेदन create करें (status: pending) ─────────── */
    // सुनिश्चित करें कि deliveryRadius को parseInt किया जा रहा है यदि यह req.body में स्ट्रिंग के रूप में आता है।
    const insertData = {
      userId: firebaseUid,
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessType: businessType, // अब अनिवार्य, इसलिए null नहीं
      description: description || null,   
      city: city,
      pincode: pincode, 
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null, 
      ifscCode: ifscCode || null,
      deliveryRadius: deliveryRadius ? parseInt(String(deliveryRadius)) : null, // ✅ सुरक्षित parseInt
      approvalStatus: "pending",
      // createdAt, updatedAt जैसे टाइमस्टैम्प स्कीमा में defaultNow() से हैंडल होंगे,
      // इसलिए यहाँ मैन्युअल रूप से सेट करने की आवश्यकता नहीं है।
    };

    // ✅ यह लॉग हमें दिखाएगा कि डेटाबेस में क्या इन्सर्ट किया जा रहा है
    console.log("Seller data prepared for insertion:", insertData);

    const newSellerResult = await db
      .insert(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
      .values(insertData) 
      .returning(); 

    const newSeller = newSellerResult[0]; 

    /* ─────────── 6. उसी user की role = pending_seller कर दें ─────────── */
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

    /* ─────────── 7. सक्सेस रिस्पॉन्स भेजें ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller, 
      user: {
          uuid: updatedUser.firebaseUid, // ✅ users.uuid के बजाय firebaseUid
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
Isme role pending seller set kiya ja raha hai
