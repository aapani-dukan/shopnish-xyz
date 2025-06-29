// routes/sellers/me.ts

import express from "express";
import { verifyToken, AuthenticatedRequest } from "../../server/middleware/verifyToken"; // ✅ सही path
import { db } from "../../server/db"; // ✅ सही path
import { sellersPgTable } from "../../shared/backend/schema"; // ✅ Drizzle table
import { eq } from "drizzle-orm"; 

const router = express.Router();

// 🔐 Protected route for seller's own data
router.get("/me", verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: Missing user info." });
  }

  try {
    // ✅ Drizzle ORM का सही query सिंटैक्स
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
