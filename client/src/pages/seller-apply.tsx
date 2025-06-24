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
      // यदि उपयोगकर्ता प्रमाणित नहीं है, तो अनधिकृत त्रुटि लौटाएँ
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
    if (!businessName || !businessPhone || !city || !pincode || !businessAddress) {
      return res.status(400).json({ message: "Missing required seller details." });
    }

    /* ─────────── 4. पहले से आवेदन या approve तो नहीं? ─────────── */
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

    /* ─────────── 5. नया आवेदन create करें (status: pending) ─────────── */
    // ✅ यहाँ हम डेटा प्रकारों को ठीक करने का प्रयास कर रहे हैं
    const insertData = {
      userId: firebaseUid,
      businessName: businessName,
      businessAddress: businessAddress,
      businessPhone: businessPhone,
      businessType: businessType || null, // यदि businessType खाली है तो null पर सेट करें
      description: description || null,   // यदि description खाली है तो null पर सेट करें
      city: city,
      pincode: pincode, // ✅ अपनी स्कीमा में pincode के डेटाटाइप की जांच करें (text/varchar या integer)
      gstNumber: gstNumber || null,
      bankAccountNumber: bankAccountNumber || null, // ✅ bankAccountNumber के डेटाटाइप की जांच करें
      ifscCode: ifscCode || null,
      // deliveryRadius को संख्या में बदलें। यदि यह NaN (Not a Number) है तो null करें।
      // यह महत्वपूर्ण है यदि स्कीमा में deliveryRadius एक INTEGER है।
      deliveryRadius: deliveryRadius ? parseInt(deliveryRadius) : null, 
      approvalStatus: "pending",
      // यदि आपकी स्कीमा में createdAt, updatedAt, appliedAt पर defaultNow() है,
      // तो आप इन लाइनों को हटा सकते हैं। यदि एरर जारी रहती है, तो इन्हें
      // new Date().toISOString() के साथ वापस ला सकते हैं।
      // createdAt: new Date().toISOString(), 
      // updatedAt: new Date().toISOString(), 
      // appliedAt: new Date().toISOString(), 
    };

    // ✅ यह लॉग हमें दिखाएगा कि डेटाबेस में क्या इन्सर्ट किया जा रहा है
    console.log("Seller data prepared for insertion:", insertData);

    const newSellerResult = await db
      .insert(sellers)
      .values(insertData) // तैयार डेटा ऑब्जेक्ट का उपयोग करें
      .returning(); // यह इन्सर्टेड रिकॉर्ड को लौटाता है

    const newSeller = newSellerResult[0]; // पहला एलिमेंट प्राप्त करें

    /* ─────────── 6. उसी user की role = pending_seller कर दें ─────────── */
    const updatedUserResult = await db
      .update(users)
      .set({ 
        role: "pending_seller", 
        // updatedAt: new Date().toISOString() // यदि स्कीमा में defaultNow() है, तो इसे भी छोड़ा जा सकता है
      })
      .where(eq(users.firebaseUid, firebaseUid)) // firebaseUid के आधार पर उपयोगकर्ता को अपडेट करें
      .returning(); // यह अपडेटेड रिकॉर्ड को लौटाता है

    const updatedUser = updatedUserResult[0]; // पहला एलिमेंट प्राप्त करें

    if (!updatedUser) {
        // यदि किसी कारण से उपयोगकर्ता नहीं मिल पाता है या अपडेट नहीं हो पाता है
        console.error("Seller apply: Could not find user to update role for firebaseUid:", firebaseUid);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    /* ─────────── 7. सक्सेस रिस्पॉन्स भेजें ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller, // नए विक्रेता का डेटा भेजें
      user: {
          uuid: updatedUser.uuid, // अपडेटेड उपयोगकर्ता का मुख्य डेटा भेजें
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error in seller apply route:", error);
    // ✅ एरर को एक्सप्रेस के एरर हैंडलिंग मिडलवेयर को पास करें
    next(error); 
  }
});

export default router;
