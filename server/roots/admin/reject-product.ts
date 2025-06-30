import express from "express";
import { db } from "../../db";
import { products } from "../../../shared/backend/schema";
import { verifyToken, AuthenticatedRequest } from "../../middleware/verifyToken";
import { eq } from "drizzle-orm";

const router = express.Router();

// 🔐 Reject product (admin only)
router.post("/:productId", verifyToken, async (req: AuthenticatedRequest, res) => {
  const productId = parseInt(req.params.productId);

  if (isNaN(productId) || productId <= 0) {
    return res.status(400).json({ message: "Invalid productId" });
  }

  try {
    const updatedProduct = await db
      .update(products)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();

    if (!updatedProduct[0]) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ message: "Product rejected", product: updatedProduct[0] });
  } catch (error) {
    console.error("Error rejecting product:", error);
    res.status(500).json({ message: "Failed to reject product" });
  }
});

export default router;
