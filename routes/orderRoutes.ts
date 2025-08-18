// server/routes/ordersRoutes.ts

import { Router } from 'express';
import { createOrder, getUserOrders } from '../server/controllers/orderController.ts';

const router = Router();

// POST route to create a new order
// This will handle requests to /api/orders
router.post('/', createOrder);

// GET route to fetch a user's orders
// This will handle requests to /api/orders
router.get('/', getUserOrders);

export default router;
