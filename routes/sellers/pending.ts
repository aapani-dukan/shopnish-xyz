import { Router, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellersPgTable, users } from "../../shared/backend/schema";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { eq, desc } from "drizzle-orm";

const router = Router();

// 🔐 Middleware to ensure user is admin
const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: Missing user ID" });
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, req.user.userId))
      .limit(1);

    const user = userResult[0];

    if (user?.role === "admin") {
      return next();
    }

    return res.status(403).json({ message: "Forbidden: Admin access required" });
  } catch (error) {
    console.error("❌ Error verifying admin role:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during role check" });
  }
};

// ✅ Route to get all pending sellers (admin only)
router.get(
  "/",
  verifyToken,
  isAdmin,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pendingSellers = await db
        .select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.approvalStatus, "pending" as const))
        .orderBy(desc(sellersPgTable.createdAt));

      return res.status(200).json({ data: pendingSellers });
    } catch (error) {
      console.error("❌ Error fetching pending sellers:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch pending sellers", error });
    }
  }
);

export default router;
