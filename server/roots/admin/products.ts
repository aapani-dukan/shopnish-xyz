// server/roots/admin/products.ts
import { Router, Response } from 'express';
import { storage } from '../../storage.ts'; // Correct relative path
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';

const router = Router();

router.get('/admin/products', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, search, status } = req.query; // Assuming status filter might be needed

    const productsList = await storage.getProducts({
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      search: search as string | undefined,
      // status: status as string | undefined, // Add if you implement this filter in storage
    });
    res.status(200).json(productsList);
  } catch (error: any) {
    console.error('Failed to fetch admin products:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
