// server/roots/admin/orderdBoyRoutes.ts
import { Router, Response } from "express";
import { db } from "../../db";
import { orders } from "@shared/backend/schema";

const orderdBoyRouter = Router();

// सभी orders fetch करने का route (कोई filter नहीं)
orderdBoyRouter.get("/orders", async (req, Response) => {
  try {
    const allOrders = await db.query.orders.findMany({
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

    res.status(200).json(allOrders);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default orderdBoyRouter;
