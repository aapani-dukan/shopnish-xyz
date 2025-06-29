import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema"; 
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// ✅ isAdmin middleware (reuse from previous file)
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: User not authenticated." });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.uid))
      .limit(1);

    const user = userResult[0];

    if (user?.role === "admin") {
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
 * GET /api/sellers/pending
 * Returns all sellers with approvalStatus = 'pending'
 * Only for authenticated admins
 */
router.get("/", verifyToken, isAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pendingSellers = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.approvalStatus, sql`'pending'::seller_approval_status`)) // ✅ Enum-safe
      .orderBy(desc(sellersPgTable.createdAt));

    res.json(pendingSellers);
  } catch (error) {
    console.error("Error fetching pending sellers:", error);
    next(error);
  }
});

export default router;
