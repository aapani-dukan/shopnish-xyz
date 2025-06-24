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
      deliveryRadius, // यह integer होना चाहिए अगर स्कीमा में ऐसा है
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

    // ✅ यहाँ संभावित समस्या का समाधान!
    // सुनिश्चित करें कि संख्यात्मक फ़ील्ड्स संख्याएँ ही हों या null.
    // अन्य वैकल्पिक फ़ील्ड्स को स्पष्ट रूप से null या undefined करें यदि वे खाली स्ट्रिंग हों।
    const insertData = {
      userId: firebaseUid,
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessType: businessType || null, // यदि खाली है तो null
      description: description || null,   // यदि खाली है तो null
      city: city,
      pincode: pincode,
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null,
      ifscCode: ifscCode || null,
      // deliveryRadius को संख्या में बदलें, या null करें यदि अमान्य है
      deliveryRadius: deliveryRadius ? parseInt(deliveryRadius) : null, // ⚠️ इसे जांचें!
      approvalStatus: "pending",
      // स्कीमा में defaultNow() है, तो आप इन्हें छोड़ सकते हैं।
      // यदि फिर भी एरर आती है, तो new Date().toISOString() को वापस ला सकते हैं।
      // createdAt: new Date().toISOString(),
      // updatedAt: new Date().toISOString(),
      // appliedAt: new Date().toISOString(),
    };

    // लॉग करें कि आप क्या इन्सर्ट कर रहे हैं
    console.log("Attempting to insert seller with data:", insertData);

    const newSellerResult = await db
      .insert(sellers)
      .values(insertData)
      .returning();

    const newSeller = newSellerResult[0];

    // User अपडेट के लिए भी यही सावधानी बरतें
    const updatedUserResult = await db
      .update(users)
      .set({ 
        role: "pending_seller", 
        // updatedAt: new Date().toISOString() // यदि स्कीमा में defaultNow() है तो इसे भी छोड़ा जा सकता है
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
    next(error); // Express के एरर हैंडलिंग को पास करें
  }
});

export default router;
