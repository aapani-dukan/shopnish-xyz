// server/routes/adminDeliveryRouter.ts
import { Router, Response } from "express";
import { db } from "../../db";
import { orders, orderItems, users } from "@shared/backend/schema";
import { eq, exists, and, desc } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const adminDeliveryRouter = Router();

// ✅ GET /api/delivery/orders
adminDeliveryRouter.get("/orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deliveryBoyId = req.query.deliveryBoyId as string | undefined;

    if (!deliveryBoyId) {
      return res.status(400).json({ error: "deliveryBoyId query param is required." });
    }

    // Fetch all orders assigned to this delivery boy OR unassigned
    const deliveryOrders = await db.query.orders.findMany({
      where: deliveryBoyId
        ? or(
            eq(orders.delivery_boy_id, deliveryBoyId), // assigned orders
            eq(orders.delivery_boy_id, null)          // unassigned orders
          )
        : undefined,
      with: {
        customer: true,
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
      orderBy: desc(orders.createdAt),
    });

    return res.status(200).json({ orders: deliveryOrders });
  } catch (error: any) {
    console.error("❌ Error in GET /api/delivery/orders:", error);
    return res.status(500).json({ error: "Failed to fetch delivery orders." });
  }
});
export default orderdBoyRouter;
