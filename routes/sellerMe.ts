import express, { Response } from "express";
import { verifyToken, AuthenticatedRequest } from "../server/middleware/verifyToken";
import { db } from "../server/db.ts";
import { sellersPgTable } from "../shared/backend/schema.ts";
import { eq } from "drizzle-orm";

const router = express.Router();

/**
 * GET /api/sellers/me
 * 🔐 Protected route – returns logged-in seller's own profile
 */
router.get("/me", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: Missing user info." });
  }

  try {
    const sellerResult = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, req.user.userId))
      .limit(1);

    const seller = sellerResult[0];

    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found for this user." });
    }

    return res.status(200).json({ data: seller });
  } catch (error) {
    console.error("❌ Error fetching seller info:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
});

export default router;
