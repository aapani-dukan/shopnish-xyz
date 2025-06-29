// routes/sellers/pending.ts
import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
// ✅ 'sellers' को 'sellersPgTable' से बदलें ताकि सही Drizzle टेबल का उपयोग हो
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq, desc } from "drizzle-orm"; 

const router = Router();

// isAdmin मिडलवेयर (पिछले वाले के समान, सुनिश्चित करें कि यह आपके सिस्टम में सही ढंग से परिभाषित है)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db.select()
                               .from(users)
                               .where(eq(users.firebaseUid, req.user.userId)) // ✅ FIXED
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
 * Endpoint to get all pending seller applications.
 * Requires authentication and admin privileges.
 */
router.get("/", verifyToken, isAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स और sellersPgTable का उपयोग करें
    const pendingSellers = await db.select()
                                   .from(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
                                   .where(eq(sellersPgTable.approvalStatus, "pending")) // ✅ sellersPgTable का उपयोग करें
                                   .orderBy(desc(sellersPgTable.createdAt)); // ✅ sellersPgTable.createdAt का उपयोग करें (appliedAt नहीं)

    res.json(pendingSellers);
  } catch (error) {
    console.error("Error fetching pending sellers:", error);
    next(error); 
  }
});

export default router;
