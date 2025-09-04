// server/roots/admin/orderdBoyRoutes.ts
import { Router, Response } from "express";
import { db } from "../../db";
import { orders, deliveryBoys, orderItems } from "@shared/backend/schema";
import { requireDeliveryAuth, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { eq } from "drizzle-orm";

const orderdBoyRouter = Router();

/**
 * GET /api/delivery-boy/orders
 * Fetch orders assigned to logged-in delivery boy
 */
orderdBoyRouter.get("/orders", requireDeliveryAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deliveryBoyUserId = req.user?.id;
    if (!deliveryBoyUserId) return res.status(401).json({ error: "Unauthorized" });

    // Find delivery boy profile
    const [deliveryBoyProfile] = await db.select().from(deliveryBoys).where(eq(deliveryBoys.userId, Number(deliveryBoyUserId)));

    if (!deliveryBoyProfile) return res.status(404).json({ error: "Delivery boy profile not found" });

    const deliveryBoyId = deliveryBoyProfile.id;

    // Fetch orders assigned to this delivery boy
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

    return res.status(200).json(assignedOrders);
  } catch (error: any) {
    console.error("❌ Error fetching delivery boy orders:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default orderdBoyRouter;
