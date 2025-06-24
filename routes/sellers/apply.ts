// routes/sellers/apply.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db"; // ✅ db ऑब्जेक्ट का इम्पोर्ट सही है
import { sellers, users } from "../../shared/backend/schema"; // ✅ स्कीमा टेबल्स का इम्पोर्ट सही है
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm"; // ✅ 'eq' का इम्पोर्ट सही है

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

    /* ─────────── 4. पहले से आवेदन या approve तो नहीं? ─────────── */
    // ❌ OLD: const existingSeller = await db.query.sellers.findFirst({ where: eq(sellers.userId, firebaseUid), });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स
    const existingSeller = await db.select() // db.select() का उपयोग करें
                                   .from(sellers) // किस टेबल से सिलेक्ट करना है
                                   .where(eq(sellers.userId, firebaseUid)) // eq() का उपयोग करके कंडीशन
                                   .limit(1); // केवल एक रिकॉर्ड प्राप्त करने के लिए

    // Drizzle select() हमेशा एक एरे लौटाता है, भले ही limit(1) हो।
    if (existingSeller.length > 0) { // इसलिए .length > 0 से चेक करें
      return res.status(400).json({
        message: "Seller application already exists or approved.",
        status: existingSeller[0].approvalStatus, // पहले एलिमेंट से status प्राप्त करें
      });
    }

    /* ─────────── 5. नया आवेदन create करें (status: pending) ─────────── */
    // ❌ OLD: const [newSeller] = await db.insert(sellers).values({ ... }).returning();
    // ✅ NEW: Drizzle insert()
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
        appliedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning(); // यह एक एरे लौटाता है

    const newSeller = newSellerResult[0]; // पहला एलिमेंट प्राप्त करें

    /* ─────────── 6. उसी user की role = pending_seller कर दें ─────────── */
    // ❌ OLD: const [updatedUser] = await db.update(users).set({ ... }).where(eq(users.firebaseUid, firebaseUid)).returning();
    // ✅ NEW: Drizzle update()
    const updatedUserResult = await db
      .update(users)
      .set({ role: "pending_seller", updatedAt: new Date() })
      .where(eq(users.firebaseUid, firebaseUid))
      .returning(); // यह भी एक एरे लौटाता है

    const updatedUser = updatedUserResult[0]; // पहला एलिमेंट प्राप्त करें

    if (!updatedUser) {
        console.error("Seller apply: Could not find user to update role for firebaseUid:", firebaseUid);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    /* ─────────── 7. सक्सेस रिस्पॉन्स भेजें ─────────── */
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
    // ✅ सुनिश्चित करें कि एरर को ठीक से हैंडल किया गया है
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
