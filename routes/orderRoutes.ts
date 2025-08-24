// server/routes/orderRoutes.ts

import { Router, Response } from "express";
import { AuthenticatedRequest } from "../server/middleware/authMiddleware";
// ✅ db, orders, orderItems, v4 जैसे सीधे इंपोर्ट हटा दें
import { requireAuth } from "../server/middleware/authMiddleware";
import { getUserOrders, placeOrder } from "../server/controllers/orderController"; // ✅ placeOrder को इंपोर्ट करें

const ordersRouter = Router();

// ✅ अब POST रूट सीधे orderController के placeOrder फ़ंक्शन को कॉल करेगा
ordersRouter.post("/", requireAuth, placeOrder);

// ✅ getUserOrders रूट
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
