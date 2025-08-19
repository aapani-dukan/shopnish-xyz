// server/routes/orderConfirmationRouter.ts

import { Router } from 'express';
import { db } from '../server/db.ts'; // Assuming your db connection is in a file named db.ts
import { orders } from '../shared/backend/schema.ts'; // Assuming schema.ts is located here
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/orders/:orderId
// This endpoint fetches a single order by its ID for the confirmation page
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Validate that orderId is a valid number
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, parseInt(orderId)),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json(order);

  } catch (error) {
    console.error("Error fetching order confirmation details:", error);
    res.status(500).json({ message: "Failed to fetch order details." });
  }
});

export default router;
