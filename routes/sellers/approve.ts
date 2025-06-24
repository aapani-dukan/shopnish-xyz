// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db"; // db ऑब्जेक्ट इम्पोर्ट करें
import { sellers, users } from "../../shared/backend/schema"; // स्कीमा टेबल्स इम्पोर्ट करें
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq } from "drizzle-orm"; // 'eq' को Drizzle के लिए इम्पोर्ट करें

const router = Router();

// एक साधारण isAdmin मिडलवेयर का उदाहरण
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    // ❌ OLD: const user = await db.query.users.findFirst({ where: eq(users.firebaseUid, req.user.uid) });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स का उपयोग करें
    const userResult = await db.select()
                               .from(users)
                               .where(eq(users.firebaseUid, req.user.uid))
                               .limit(1); // केवल एक रिकॉर्ड प्राप्त करने के लिए

    const user = userResult.length > 0 ? userResult[0] : null; // एरे से पहला यूजर निकालें, यदि कोई है

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
 * Body ⇒ { sellerId: number } (यह Drizzle 'id' of the seller record है)
 */
router.post("/", verifyToken, isAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    // 1. Find the seller
    // ❌ OLD: const existingSeller = await db.query.sellers.findFirst({ where: eq(sellers.id, sellerId) });
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स
    const existingSellerResult = await db.select()
                                         .from(sellers)
                                         .where(eq(sellers.id, sellerId))
                                         .limit(1);

    const existingSeller = existingSellerResult.length > 0 ? existingSellerResult[0] : null;

    if (!existingSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    if (existingSeller.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Seller is already approved." });
    }
    if (existingSeller.approvalStatus === 'rejected') {
        return res.status(400).json({ message: "Seller was previously rejected. Please review." });
    }


    // 2. Approve the seller
    // ❌ OLD: const [updatedSeller] = await db.update(sellers)...
    // ✅ NEW: Drizzle update()
    const updatedSellerResult = await db
      .update(sellers)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(sellers.id, sellerId))
      .returning(); // यह एक एरे लौटाता है

    const updatedSeller = updatedSellerResult[0]; // पहला एलिमेंट प्राप्त करें

    // 3. Update user role to "seller"
    // ❌ OLD: const [updatedUser] = await db.update(users)...
    // ✅ NEW: Drizzle update()
    const updatedUserResult = await db
      .update(users)
      .set({ role: "seller", updatedAt: new Date() })
      .where(eq(users.firebaseUid, existingSeller.userId))
      .returning(); // यह एक एरे लौटाता है

    const updatedUser = updatedUserResult[0]; // पहला एलिमेंट प्राप्त करें

    if (!updatedUser) {
        console.error("Seller approve: Could not find user to update role for firebaseUid:", existingSeller.userId);
        return res.status(500).json({ message: "Failed to update user role." });
    }

    res.json({
      message: "Seller approved and role updated to 'seller'",
      seller: updatedSeller,
      user: {
          uuid: updatedUser.uuid,
          role: updatedUser.role,
          email: updatedUser.email,
          name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error in seller approve route:", error);
    // ✅ सुनिश्चित करें कि एरर को ठीक से हैंडल किया गया है
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
