// routes/sellers/apply.ts
import { Router, Response, NextFunction } from "express"; // Request को हटाया, AuthenticatedRequest का उपयोग होगा
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";
// ✅ verifyToken और AuthenticatedRequest को इम्पोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
// ✅ eq को Drizzle के लिए इम्पोर्ट करें
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Endpoint for a user to apply as a seller.
 * Requires authentication via verifyToken middleware.
 *
 * Body ⇒ { businessName, businessAddress?, phoneNumber, description, ...other seller fields }
 * (userId will be taken from req.user.uid, NOT from body)
 */
router.post("/", verifyToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ 1. Authenticated User ID (Firebase UID) को req.user से प्राप्त करें
    // यह ID Firebase द्वारा सत्यापित है और सबसे विश्वसनीय है।
    const firebaseUid = req.user?.uid;

    // ✅ सुनिश्चित करें कि authenticated user मौजूद है
    if (!firebaseUid) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated." });
    }

    // ✅ 2. बाकी seller डेटा को request body से प्राप्त करें
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

    // ✅ 3. सभी आवश्यक फ़ील्ड्स की जाँच करें
    if (!businessName || !businessPhone || !city || !pincode || !businessAddress) {
      return res.status(400).json({ message: "Missing required seller details." });
    }

    /* ─────────── 4. पहले से आवेदन या approve तो नहीं? ─────────── */
    // ✅ sellers टेबल में user_id कॉलम (जो Firebase UID स्टोर करता है) का उपयोग करें
    const existingSeller = await db.query.sellers.findFirst({
      where: eq(sellers.userId, firebaseUid),
    });

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller.approvalStatus, // मौजूदा स्थिति दिखाएं
      });
    }

    /* ─────────── 5. नया आवेदन create करें (status: pending) ─────────── */
    const [newSeller] = await db
      .insert(sellers)
      .values({
        // ✅ userId के लिए authenticated Firebase UID का उपयोग करें
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
        appliedAt: new Date(),
        createdAt: new Date(), 
        updatedAt: new Date(), 
      })
      .returning();

    /* ─────────── 6. उसी user की role = pending_seller कर दें ─────────── */
    // ✅ users टेबल में user का role अपडेट करने के लिए firebase_uid कॉलम का उपयोग करें
    const [updatedUser] = await db
      .update(users)
      .set({ role: "pending_seller", updatedAt: new Date() }) 
      .where(eq(users.firebaseUid, firebaseUid)) // ✅ users.firebaseUid का उपयोग करें
      .returning();

    // ✅ सुनिश्चित करें कि यूजर अपडेट हुआ
    if (!updatedUser) {
        console.error("Seller apply: Could not find user to update role for firebaseUid:", firebaseUid);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    /* ─────────── 7. सक्सेस रिस्पॉन्स भेजें ─────────── */
    res.status(201).json({
      message: "Seller application submitted",
      seller: newSeller,
      // ✅ यूजर ऑब्जेक्ट में uuid और अन्य आवश्यक जानकारी भेजें
      user: {
          uuid: updatedUser.uuid, 
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name, // यदि उपलब्ध हो तो
      },
    });
  } catch (error) {
    console.error("Error in seller apply route:", error); 
    next(error);
  }
});

export default router;
