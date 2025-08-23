//routes/orderRoutes.ts

import { Router } from 'express';
import { placeOrder, getUserOrders } from '../server/controllers/orderController.ts';
import { requireAuth } from '../server/middleware/authMiddleware.ts'; // ✅ मिडलवेयर को आयात करें

const ordersRouter = Router();

// POST और GET रूट्स पर `requireAuth` मिडलवेयर लागू करें
// यह सुनिश्चित करता है कि अनुरोध भेजने से पहले उपयोगकर्ता प्रमाणित हो
ordersRouter.post('/', requireAuth, placeOrder);
ordersRouter.get('/', requireAuth, getUserOrders);


export default orderRouter;
