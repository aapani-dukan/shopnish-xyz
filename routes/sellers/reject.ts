// routes/sellers/reject.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers, users } from "../../shared/backend/schema"; // users स्कीमा को इम्पोर्ट करें
// ✅ verifyToken और AuthenticatedRequest को इम्पोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
// ✅ eq को Drizzle के लिए इम्पोर्ट करें
import { eq } from "drizzle-orm";

const router = Router();

// isAdmin मिडलवेयर (सुनिश्चित करें कि यह आपके सिस्टम में सही ढंग से परिभाषित है)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, req.user.uid),
    });

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
 * Endpoint to reject a seller application.
 * Requires authentication and admin privileges.
 *
 * Body ⇒ { sellerId: number, reason: string } (sellerId is the Drizzle 'id' of the seller record)
 */
// ✅ verifyToken और isAdmin मिडलवेयर का उपयोग करें
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ sellerId और reason को body से प्राप्त करें
    const { sellerId, reason } = req.body;

    if (!sellerId || !reason) {
      return res.status(400).json({ message: "sellerId and reason are required" });
    }

    // 1. Find the seller
    const existingSeller = await db.query.sellers.findFirst({
      // ✅ sellers.id का उपयोग करें क्योंकि sellerId यहाँ Drizzle 'id' को रेफर करता है
      where: eq(sellers.id, sellerId), 
    });

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // ✅ सुरक्षा जाँच: यदि विक्रेता पहले से स्वीकृत है तो अस्वीकार न करें (वैकल्पिक)
    if (existingSeller.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Seller is already approved and cannot be rejected." });
    }

    // 2. Reject the seller
    const [updatedSeller] = await db
      .update(sellers)
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason,
        approvedAt: null, // यदि गलती से स्वीकृत हो गया था तो null करें
        updatedAt: new Date(), // updatedAt भी अपडेट करें
      })
      // ✅ sellers.id का उपयोग करें
      .where(eq(sellers.id, sellerId)) 
      .returning();

    // 3. Update user role back to "user" (from "pending_seller")
    // ✅ users.firebaseUid का उपयोग करें क्योंकि existingSeller.userId ही Firebase UID है
    const [updatedUser] = await db
      .update(users)
      .set({ role: "user", updatedAt: new Date() }) // रोल को वापस 'user' करें
      .where(eq(users.firebaseUid, existingSeller.userId)) // ✅ existingSeller.userId ही Firebase UID है
      .returning();

    // ✅ सुनिश्चित करें कि यूजर अपडेट हुआ
    if (!updatedUser) {
        console.error("Seller reject: Could not find user to update role for firebaseUid:", existingSeller.userId);
        // यहाँ हम 500 एरर नहीं देंगे क्योंकि विक्रेता का स्टेटस अपडेट हो गया है,
        // लेकिन एक चेतावनी लॉग करेंगे। आप इसे एक गंभीर एरर मानकर 500 भी दे सकते हैं।
    }

    res.json({
      message: "Seller application rejected.",
      seller: updatedSeller,
      // ✅ यूजर ऑब्जेक्ट में uuid और अन्य आवश्यक जानकारी भेजें
      user: updatedUser ? {
          uuid: updatedUser.uuid, 
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name, // यदि उपलब्ध हो तो
      } : undefined, // यदि यूजर अपडेट नहीं हुआ तो undefined भेजें
    });
  } catch (error) {
    console.error("Error in seller reject route:", error); 
    next(error);
  }
});

export default router;
