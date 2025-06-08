import express from "express";
import { verifyToken } from "../server/middleware/verifyToken";
import { db } from "../server/db";
import { sellers } from "../shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// 🔐 Protected route for seller's own data
router.get("/api/sellers/me", verifyToken, async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const seller = await db.query.sellers.findFirst({
    where: eq(sellers.userId, user.uid),
  });

  if (!seller) return res.status(404).json({ message: "Seller not found" });

  res.json(seller);
});

export default router;
