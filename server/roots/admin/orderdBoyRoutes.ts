// server/roots/admin/orderdBoyRoutes.ts
import { Router, Response } from "express";
import { db } from "../../db";
import { orders, orderItems } from "@shared/backend/schema";
import { requireDeliveryBoyAuth, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { eq } from "drizzle-orm";

const orderdBoyRouter = Router();

// Delivery boy के लिए orders fetch करने का route
orderdBoyRouter.get("/orders", requireDeliveryBoyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deliveryBoyId = req.user?.id; // Delivery boy का user.id
    if (!deliveryBoyId) return res.status(401).json({ error: "Unauthorized" });

    const assignedOrders = await db.query.orders.findMany({
      where: eq(orders.deliveryBoyId, deliveryBoyId),
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: [{ column: orders.createdAt, order: "desc" }],
    });

    res.status(200).json(assignedOrders);
  } catch (error) {
    console.error("❌ Error fetching delivery boy orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default orderdBoyRouter;
