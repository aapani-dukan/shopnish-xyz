//routes/orderRoutes.ts

import { Router } from 'express';
import { createOrder, getUserOrders } from '../controllers/orderController';
import { requireAuth } from '../server/middleware/authMiddleware.ts'; // ✅ मिडलवेयर को आयात करें

const ordersRouter = Router();

// POST और GET रूट्स पर `requireAuth` मिडलवेयर लागू करें
// यह सुनिश्चित करता है कि अनुरोध भेजने से पहले उपयोगकर्ता प्रमाणित हो
ordersRouter.post('/', requireAuth, createOrder);
ordersRouter.get('/', requireAuth, getUserOrders);

export default ordersRouter;
