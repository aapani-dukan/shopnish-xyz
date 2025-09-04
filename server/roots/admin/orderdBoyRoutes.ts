import { Router, Response } from "express";
import { db } from "../../db";
import { orders, orderItems, deliveryBoysPgTable } from "@shared/backend/schema";
import { requireDeliveryAuth, AuthenticatedRequest } from "../middleware/auth";
import { eq } from "drizzle-orm";

const orderdBoyRouter = Router();

/**
 * GET /api/delivery/orders
 * Fetch all orders assigned to the authenticated delivery boy
 */
orderdBoyRouter.get(
  "/orders",
  requireDeliveryAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deliveryBoyUserId = req.user?.id;
      if (!deliveryBoyUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch delivery boy profile
      const [deliveryBoyProfile] = await db
        .select()
        .from(deliveryBoysPgTable)
        .where(eq(deliveryBoysPgTable.userId, deliveryBoyUserId));

      if (!deliveryBoyProfile) {
        return res.status(404).json({ error: "Delivery boy profile not found." });
      }

      const deliveryBoyId = deliveryBoyProfile.id;

      // Fetch all orders assigned to this delivery boy
      const assignedOrders = await db.query.orders.findMany({
        where: eq(orders.deliveryBoyId, deliveryBoyId),
        with: {
          customer: true, // customer info
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
      console.error("❌ Error in GET /api/delivery/orders:", error);
      return res.status(500).json({ error: "Failed to fetch delivery boy orders." });
    }
  }
);

export default orderdBoyRouter;
