import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';
import { storage } from '../../storage.ts';
import { db } from '../../db.ts';
import { products } from '../../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

// ✅ GET /api/admin/products
// सभी उत्पादों को फ़ेच करता है, फिल्टरिंग विकल्पों के साथ
router.get('/', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, search, status } = req.query;

    let parsedCategoryId: number | undefined;
    if (categoryId) {
      const num = parseInt(categoryId as string);
      if (!isNaN(num)) {
        parsedCategoryId = num;
      }
    }

    const productsList = await storage.getProducts({
      categoryId: parsedCategoryId,
      search: search as string | undefined,
      status: status as string | undefined,
    });
    
    return res.status(200).json(productsList);
  } catch (error: any) {
    console.error('Failed to fetch admin products:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ✅ PATCH /api/admin/products/approve/:id
// एक उत्पाद को 'approved' के रूप में चिह्नित करता है
router.patch('/approve/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID provided." });
        }
        
        // Drizzle क्वेरी से पहले id को लॉग करें
        console.log(`Approving product with ID: ${id}, Type: ${typeof id}`);
        
        // उत्पाद को अपडेट करने से पहले ढूंढें
        const productToApprove = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!productToApprove) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Drizzle में अपडेट करें
        const [approvedProduct] = await db.update(products)
            .set({ status: 'approved' })
            .where(eq(products.id, id))
            .returning();

        res.status(200).json({
            message: "Product approved successfully.",
            product: approvedProduct,
        });
    } catch (error: any) {
        console.error("Failed to approve product:", error);
        res.status(500).json({ message: "Failed to approve product." });
    }
});

// ✅ PATCH /api/admin/products/reject/:id
// एक उत्पाद को 'rejected' के रूप में चिह्नित करता है
router.patch('/reject/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID provided." });
        }

        // Drizzle क्वेरी से पहले id को लॉग करें
        console.log(`Rejecting product with ID: ${id}, Type: ${typeof id}`);

        // उत्पाद को अपडेट करने से पहले ढूंढें
        const productToReject = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!productToReject) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Drizzle में अपडेट करें
        const [rejectedProduct] = await db.update(products)
            .set({ status: 'rejected' })
            .where(eq(products.id, id))
            .returning();
            
        res.status(200).json({
            message: "Product rejected successfully.",
            product: rejectedProduct,
        });
    } catch (error: any) {
        console.error("Failed to reject product:", error);
        res.status(500).json({ message: "Failed to reject product." });
    }
});

export default router;
