// server/routes/sellers/sellerRoutes.ts

import { Router, Response, NextFunction } from 'express';
import { db } from '../../server/db.ts';
import { 
  sellersPgTable, 
  users, 
  userRoleEnum, 
  approvalStatusEnum, 
  categories, 
  products,
  orders,
  orderItems
} from '../../shared/backend/schema.ts';
import { requireSellerAuth } from '../../server/middleware/authMiddleware.ts';
import { AuthenticatedRequest, verifyToken } from '../../server/middleware/verifyToken.ts';
import { eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm'; // ✅ SQL हेल्पर को इंपोर्ट करें
import multer from 'multer';
import { uploadImage } from '../../server/cloudStorage.ts'; 

const sellerRouter = Router();
const upload = multer({ dest: 'uploads/' });

// ... (आपके अन्य सभी राउट, जैसे /me, /apply, /products)

sellerRouter.get('/orders', requireSellerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.firebaseUid;
    if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    const [sellerProfile] = await db
        .select()
        .from(sellersPgTable)
        .where(eq(sellersPgTable.firebaseUid, firebaseUid));

    if (!sellerProfile) {
        return res.status(404).json({ error: 'Seller profile not found.' });
    }
    const sellerId = sellerProfile.id;
    console.log('✅ /sellers/orders: Received request for sellerId:', sellerId);

    // ✅ यहाँ Drizzle के join का उपयोग करके सही क्वेरी
    const sellerOrders = await db
      .selectDistinct({ order: orders })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(eq(orderItems.sellerId, sellerId))
      .orderBy(desc(orders.createdAt));

    // परिणाम से केवल ऑर्डर ऑब्जेक्ट निकालें
    const ordersWithItems = await db.query.orders.findMany({
      where: (order, { inArray }) => inArray(order.id, sellerOrders.map(o => o.order.id)),
      with: {
        items: true,
      },
    });

    console.log('✅ /sellers/orders: Orders fetched successfully. Count:', ordersWithItems.length);
    return res.status(200).json(ordersWithItems);
  } catch (error: any) {
    console.error('❌ Error in GET /api/sellers/orders:', error);
    console.error(error); 
    return res.status(500).json({ error: 'Failed to fetch seller orders.' });
  }
});

export default sellerRouter;
