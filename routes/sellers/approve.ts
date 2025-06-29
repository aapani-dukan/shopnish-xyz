// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db"; // db ऑब्जेक्ट इम्पोर्ट करें
// ✅ 'sellers' को 'sellersPgTable' से बदलें ताकि सही Drizzle टेबल का उपयोग हो
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm"; // 'eq' को Drizzle के लिए इम्पोर्ट करें

const router = Router();

// एक साधारण isAdmin मिडलवेयर का उदाहरण
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db.select()
                               .from(users)
                               .where(eq(users.firebaseUid, req.user.userId)) // ✅ FIXED HERE
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
 * Endpoint to approve a seller application.
 * Requires authentication and admin privileges.
 *
 * Body ⇒ { sellerId: number } (यह Drizzle 'id' of the seller record है)
 */
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (typeof sellerId !== 'number' || sellerId <= 0) { // ✅ बेहतर वैलिडेशन
      return res.status(400).json({ message: "A valid sellerId (number) is required." });
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
        return res.status(400).json({ message: "Seller is already approved." });
    }
    if (existingSeller.approvalStatus === 'rejected') {
        return res.status(400).json({ message: "Seller was previously rejected. Cannot approve directly. Please review." }); // ✅ बेहतर मैसेज
    }


    // 2. Approve the seller
    const updatedSellerResult = await db
      .update(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(sellersPgTable.id, sellerId)) // ✅ sellersPgTable.id का उपयोग करें
      .returning(); 

    const updatedSeller = updatedSellerResult[0]; 

    // 3. Update user role to "seller"
    const updatedUserResult = await db
      .update(users)
      .set({ role: "seller", updatedAt: new Date() })
      .where(eq(users.firebaseUid, existingSeller.userId)) // ✅ existingSeller.userId का उपयोग करें (जो Firebase UID है)
      .returning(); 

    const updatedUser = updatedUserResult[0]; 

    if (!updatedUser) {
        console.error("Seller approve: Could not find user to update role for firebaseUid:", existingSeller.userId);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    res.json({
      message: "Seller approved and role updated to 'seller'",
      seller: updatedSeller,
      user: {
          // ✅ user.uuid के बजाय user.firebaseUid का उपयोग करें (जैसा कि schema.ts में परिभाषित है)
          firebaseUid: updatedUser.firebaseUid, 
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error in seller approve route:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
