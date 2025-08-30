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
        user connected: Qk9PhrPmzOc8m8MgAAAB
User disconnected: Qk9PhrPmzOc8m8MgAAAB
POST /api/users/login 200 in 759ms :: {"message":"उपयोगकर्ता लॉगिन सफल","customToken":"ey…
GET /api/users/me 304 in 168ms :: {"id":115,"firebaseUid":"4FoEz3nFsXVM5AbWBHt9b5wjNdg2",…
A user connected: PkK1XESArRGiRisLAAAD
🛒 [API] Received GET request for cart.
✅ [API] Sending empty cart.
GET /api/cart 304 in 763ms :: {"message":"Your cart is empty","items":[]}
✅ Admin custom token created.
POST /api/auth/admin-login 200 in 1471ms :: {"message":"Admin login successful.","customT…
GET /api/users/me 304 in 166ms :: {"id":115,"firebaseUid":"4FoEz3nFsXVM5AbWBHt9b5wjNdg2",…
GET /api/admin/delivery-boys/pending-applications 304 in 178ms :: []
GET /api/admin/products 304 in 256ms :: [{"id":13,"sellerId":22,"storeId":22,"categoryId"…
GET /api/admin/vendors/sellers/pending 304 in 750ms :: []
Approving product with ID: 13, Type: number
Failed to approve product: error: syntax error at or near "where"
    at /opt/render/project/src/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async <anonymous> (/opt/render/project/src/node_modules/src/node-postgres/session.ts:104:19)
    at async file:///opt/render/project/src/dist/index.js:1098:31 {
  length: 94,
  severity: 'ERROR',
  code: '42601',
  detail: undefined,
  hint: undefined,
  position: '24',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'scan.l',
  line: '1244',
  routine: 'scanner_yyerror'
}
PATCH /api/admin/products/approve/13 500 in 339ms :: {"message":"Failed to approve produc…
A user connected: bK4SEIiSI6M79w-oAAAF
User 

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
  where: (fields, { eq }) => eq(fields.id, id),
});
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
