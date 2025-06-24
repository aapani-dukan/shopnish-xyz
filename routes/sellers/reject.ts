// routes/sellers/reject.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
// ✅ 'sellers' को 'sellersPgTable' से बदलें ताकि सही Drizzle टेबल का उपयोग हो
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm"; 

const router = Router();

// isAdmin मिडलवेयर (पिछले वाले के समान, सुनिश्चित करें कि यह आपके सिस्टम में सही ढंग से परिभाषित है)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db.select()
                               .from(users)
                               .where(eq(users.firebaseUid, req.user.uid))
                               .limit(1); 

    const user = userResult.length > 0 ? userResult[0] : null; 

    if (user?.role === 'admin') {
      next(); 
    } else {
      return res.status(403).json({ message: "Forbidden: Not an admin." }); 
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
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId, reason } = req.body;

    if (typeof sellerId !== 'number' || sellerId <= 0 || !reason || typeof reason !== 'string' || reason.trim() === '') {
      return res.status(400).json({ message: "A valid sellerId (number) and a non-empty reason (string) are required." });
    }

    // 1. Find the seller
    const existingSellerResult = await db.select()
                                         .from(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
                                         .where(eq(sellersPgTable.id, sellerId)) // ✅ sellersPgTable.id का उपयोग करें
                                         .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : null;

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found." });
    }

    if (existingSeller.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Seller is already approved and cannot be rejected." });
    }
    // यदि पहले से ही रिजेक्टेड है, तो दोबारा रिजेक्ट करने की अनुमति दें या एक अलग मैसेज दें
    if (existingSeller.approvalStatus === 'rejected') {
        // आप यहाँ एक अलग मैसेज दे सकते हैं या ऑपरेशन को जारी रख सकते हैं
        // जैसे कि कारण को अपडेट करना। अभी के लिए, हम इसे जारी रखने देंगे।
        console.log(`Seller with ID ${sellerId} is already rejected. Updating rejection reason.`);
    }


    // 2. Reject the seller
    const updatedSellerResult = await db
      .update(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason,
        approvedAt: null, // यदि रिजेक्ट किया जा रहा है तो approvedAt को null करें
        updatedAt: new Date(),
      })
      .where(eq(sellersPgTable.id, sellerId)) // ✅ sellersPgTable.id का उपयोग करें
      .returning(); 

    const updatedSeller = updatedSellerResult[0]; 

    // 3. Update user role back to "customer" (from "pending_seller" or "seller" if somehow approved and then rejected)
    const updatedUserResult = await db
      .update(users)
      .set({ role: "customer", updatedAt: new Date() }) // ✅ role को "customer" में बदलें
      .where(eq(users.firebaseUid, existingSeller.userId)) 
      .returning(); 

    const updatedUser = updatedUserResult.length > 0 ? updatedUserResult[0] : undefined; 

    if (!updatedUser) {
        console.error("Seller reject: Could not find user to update role for firebaseUid:", existingSeller.userId);
        // यहाँ हम 500 एरर नहीं देंगे क्योंकि विक्रेता का स्टेटस अपडेट हो गया है,
        // लेकिन एक चेतावनी लॉग करेंगे। आप इसे एक गंभीर एरर मानकर 500 भी दे सकते हैं।
    }

    res.json({
      message: "Seller application rejected.",
      seller: updatedSeller,
      user: updatedUser ? {
          firebaseUid: updatedUser.firebaseUid, // ✅ user.uuid के बजाय firebaseUid
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
      } : undefined, 
    });
  } catch (error) {
    console.error("Error in seller reject route:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
