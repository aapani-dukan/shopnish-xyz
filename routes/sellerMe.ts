import express from "express";
import { verifyToken, AuthenticatedRequest } from "../server/middleware/verifyToken";
import { db } from "../server/db";
import { sellers } from "../shared/backend/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// 🔐 Protected route for seller's own data
router.get("/api/sellers/me", verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.uid) {
    return res.status(401).json({ message: "Unauthorized: Missing user info" });
  }

  try {
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.userId, req.user.uid),
    });

    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found for this user" });
    }

    res.status(200).json({data:seller});
  } catch (error) {
    console.error("Error fetching seller info:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
