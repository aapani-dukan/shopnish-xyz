// server/roots/admin/products.ts

import { Router, Response } from 'express';
import { storage } from '../../storage.ts'; 
import { AuthenticatedRequest } from '../../middleware/verifyToken.ts';
import { requireAdminAuth } from '../../middleware/authMiddleware.ts';

const router = Router();

// ✅ यहाँ राउट को ठीक किया गया है।
// अब यह केवल '/' पर रिक्वेस्ट सुनेगा।
router.get('/', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categoryId, search, status } = req.query; 

    const productsList = await storage.getProducts({
      categoryId: categoryId ? parseInt(categoryId as string) : undefined,
      search: search as string | undefined,
      // status: status as string | undefined, 
    });
    // ✅ सुनिश्चित करें कि यहाँ JSON डेटा भेजा जा रहा है।
    return res.status(200).json(productsList);
  } catch (error: any) {
    console.error('Failed to fetch admin products:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
