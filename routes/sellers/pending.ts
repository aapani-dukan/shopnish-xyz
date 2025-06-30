import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq, desc } from "drizzle-orm"; 

const router = Router();

// 🔐 Admin Middleware
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.userId))
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

// ✅ Pending Sellers Route
router.get("/", verifyToken, isAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pendingSellers = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.approvalStatus, "pending" as const)) // ✅ fix with 'as const'
      .orderBy(desc(sellersPgTable.createdAt)); // ✅ works fine in most Drizzle versions

    res.json(pendingSellers);
  } catch (error) {
    console.error("Error fetching pending sellers:", error);
    next(error); 
  }
});

export default router;
