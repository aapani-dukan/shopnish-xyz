// routes/orderRoutes.ts

import { Router } from "express";
import { placeOrder, getUserOrders } from "../server/controllers/orderController";
import { requireAuth } from "@server/middleware/authMiddleware";

const ordersRouter = Router();

// POST और GET रूट्स पर `requireAuth` मिडलवेयर लागू करें
ordersRouter.post("/", requireAuth, placeOrder);
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
