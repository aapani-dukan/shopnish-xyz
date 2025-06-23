// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema";
// ✅ verifyToken और AuthenticatedRequest को इम्पोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
// ✅ eq को Drizzle के लिए इम्पोर्ट करें
import { eq } from "drizzle-orm";

const router = Router();

// एक साधारण isAdmin मिडलवेयर का उदाहरण
// **नोट:** यह सिर्फ एक उदाहरण है। वास्तविक एप्लिकेशन में, आपको इसे
// अपनी users स्कीमा और role मैनेजमेंट के आधार पर बनाना होगा।
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, req.user.uid),
    });

    // ✅ सुनिश्चित करें कि यूजर का रोल 'admin' है
    if (user?.role === 'admin') {
      next(); // एडमिन है, तो अगले मिडलवेयर/राउट पर जाएँ
    } else {
      return res.status(403).json({ message: "Forbidden: Not an admin." }); // एडमिन नहीं है
    }
  } catch (error) {
    console.error("Error checking admin role:", error);
    return res.status(500).json({ message: "Internal server error during role check." });
  }
};


/**
 * Endpoint to approve a seller application.
 * Requires authentication and admin privileges.
 *
 * Body ⇒ { sellerId: number } (This is the Drizzle 'id' of the seller record)
 */
// ✅ verifyToken और isAdmin मिडलवेयर का उपयोग करें
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ sellerId को body से प्राप्त करें (यह seller रिकॉर्ड की Drizzle 'id' है)
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    // 1. Find the seller
    const existingSeller = await db.query.sellers.findFirst({
      // ✅ sellers.id का उपयोग करें क्योंकि sellerId यहाँ Drizzle 'id' को रेफर करता है
      where: eq(sellers.id, sellerId), 
    });

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // ✅ सुरक्षा जाँच: सुनिश्चित करें कि seller पहले से approved या rejected नहीं है (वैकल्पिक)
    if (existingSeller.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Seller is already approved." });
    }
    if (existingSeller.approvalStatus === 'rejected') {
        return res.status(400).json({ message: "Seller was previously rejected. Please review." });
    }


    // 2. Approve the seller
    const [updatedSeller] = await db
      .update(sellers)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null, // यदि पहले कोई रिजेक्शन रीज़न था तो हटा दें
        updatedAt: new Date(), // updatedAt भी अपडेट करें
      })
      // ✅ sellers.id का उपयोग करें
      .where(eq(sellers.id, sellerId)) 
      .returning();

    // 3. Update user role to "seller"
    // ✅ users.firebaseUid का उपयोग करें क्योंकि existingSeller.userId ही Firebase UID है
    const [updatedUser] = await db
      .update(users)
      .set({ role: "seller", updatedAt: new Date() }) // updatedAt भी अपडेट करें
      .where(eq(users.firebaseUid, existingSeller.userId)) // ✅ existingSeller.userId ही Firebase UID है
      .returning();

    // ✅ सुनिश्चित करें कि यूजर अपडेट हुआ
    if (!updatedUser) {
        console.error("Seller approve: Could not find user to update role for firebaseUid:", existingSeller.userId);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    res.json({
      message: "Seller approved and role updated to 'seller'",
      seller: updatedSeller,
      user: {
          uuid: updatedUser.uuid, // ✅ updatedUser से uuid भेजें
          role: updatedUser.role, // रोल भी भेजें
          email: updatedUser.email,
          name: updatedUser.name, // यदि उपलब्ध हो तो
      },
    });
  } catch (error) {
    console.error("Error in seller approve route:", error); // डीबगिंग के लिए लॉग करें
    next(error);
  }
});

export default router;
