import { Router,Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';
import { storage } from '../../storage.ts';
import { db } from '../../db.ts';
import { products } from '../../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';


const router = Router();

// ✅ Get all products (optional filter by status)
router.get("/", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;

    const allProducts = await db.query.products.findMany({
      where: status ? (fields, { eq }) => eq(fields.status, String(status)) : undefined,
    });

    res.status(200).json(allProducts);
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

// ✅ Approve product
router.patch("/approve/:id", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const product = await db.query.products.findFirst({
      where: (fields, { eq }) => eq(fields.id, id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const [approved] = await db
      .update(products)
      .set({ status: "approved" })
      .where(eq(products.id, id))
      .returning();

    res.status(200).json({
      message: "Product approved successfully.",
      product: approved,
    });
  } catch (error: any) {
    console.error("Failed to approve product:", error);
    res.status(500).json({ message: "Failed to approve product." });
  }
});

// ✅ Reject product
router.patch("/reject/:id", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const product = await db.query.products.findFirst({
      where: (fields, { eq }) => eq(fields.id, id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const [rejected] = await db
      .update(products)
      .set({ status: "rejected" })
      .where(eq(products.id, id))
      .returning();

    res.status(200).json({
      message: "Product rejected successfully.",
      product: rejected,
    });
  } catch (error: any) {
    console.error("Failed to reject product:", error);
    res.status(500).json({ message: "Failed to reject product." });
  }
});

// ✅ Delete product
router.delete("/:id", requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const product = await db.query.products.findFirst({
      where: (fields, { eq }) => eq(fields.id, id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    res.status(200).json({
      message: "Product deleted successfully.",
      product: deleted,
    });
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ message: "Failed to delete product." });
  }
});

export default router;
