// routes/sellers/me.ts
import express from "express";
import { verifyToken, AuthenticatedRequest } from "../server/middleware/verifyToken";
import { db } from "../server/db";
// ✅ 'sellers' को 'sellersPgTable' से बदलें ताकि सही Drizzle टेबल का उपयोग हो
import { sellersPgTable } from "../shared/backend/schema"; 
import { eq } from "drizzle-orm"; 

const router = express.Router();

// 🔐 Protected route for seller's own data
router.get("/me", verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized: Missing user info." });
  }

  try {
    // ✅ NEW: Drizzle ORM में सही सिंटैक्स और sellersPgTable का उपयोग करें
    const sellerResult = await db.select()
                                 .from(sellersPgTable) // ✅ sellersPgTable का उपयोग करें
                                 .where(eq(sellersPgTable.userId, req.user.userId)) // ✅ sellersPgTable.userId का उपयोग करें
                                 .limit(1); 

    const seller = sellerResult.length > 0 ? sellerResult[0] : undefined; 

    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found for this user." });
    }

    res.status(200).json({ data: seller });
  } catch (error) {
    console.error("Error fetching seller info:", error);
    res.status(500).json({ message: "Internal Server Error", error: (error as Error).message });
  }
});

export default router;
