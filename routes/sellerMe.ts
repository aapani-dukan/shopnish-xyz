import { Router, Response } from "express";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken";
import { db } from "../../server/db";
import { sellersPgTable } from "../../shared/backend/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/sellers/me
 * Purpose: Authenticated seller can fetch their own application/profile
 */
router.get("/", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const firebaseUid = req.user?.uid;

  if (!firebaseUid) {
    return res.status(401).json({ message: "Unauthorized: Missing user info." });
  }

  try {
    const sellerResult = await db
      .select()
      .from(sellersPgTable)
      .where(eq(sellersPgTable.userId, firebaseUid))
      .limit(1);

    const seller = sellerResult[0];

    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found." });
    }

    res.status(200).json({ seller });
  } catch (error) {
    console.error("Error in /api/sellers/me:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
