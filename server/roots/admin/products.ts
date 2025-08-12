// server/roots/admin/products.ts

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';
import { storage } from '../../storage.ts'; // ध्यान दें: यह सुनिश्चित करें कि 'storage.ts' में getProducts फ़ंक्शन है

const router = Router();

// GET /api/admin/products
router.get('/', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, search, status } = req.query;

    // ✅ categoryId को सुरक्षित रूप से नंबर में बदलें
    let parsedCategoryId: number | undefined;
    if (categoryId) {
      const num = parseInt(categoryId as string);
      if (!isNaN(num)) {
        parsedCategoryId = num;
      }
    }

    const productsList = await storage.getProducts({
      categoryId: parsedCategoryId, // अब यहाँ सुरक्षित नंबर पास किया जा रहा है
      search: search as string | undefined,
      // status: status as string | undefined,
    });
    
    return res.status(200).json(productsList);
  } catch (error: any) {
    console.error('Failed to fetch admin products:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
