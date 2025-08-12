// routes/products.ts

import { Router, Request, Response } from 'express';
import { db } from '../server/db.ts';
import { products, categories } from '../shared/backend/schema.ts';
import { eq, like } from 'drizzle-orm';

const router = Router();

// GET /api/products (यह सभी प्रोडक्ट्स को लिस्ट करता है)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query;

    let query = db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      image: products.image,
      sellerId: products.sellerId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));

    if (categoryId) {
      const parsedCategoryId = parseInt(categoryId as string);
      if (!isNaN(parsedCategoryId)) {
        query = query.where(eq(products.categoryId, parsedCategoryId));
      }
    }
    
    if (search) {
      query = query.where(like(products.name, `%${search}%`));
    }

    const productsList = await query;
    res.status(200).json(productsList);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

// GET /api/products/:id (यह एक सिंगल प्रोडक्ट को फ़ेच करता है)
// ✅ यह राउट '/:id' पाथ पर है, न कि '/products/:id' पर।
router.get('/:id', async (req: Request, res: Response) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID.' });

  try {
    const [product] = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      price: products.price,
      image: products.image,
      sellerId: products.sellerId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId));

    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.status(200).json(product);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal error.' });
  }
});

export default router;
