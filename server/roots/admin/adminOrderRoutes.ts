// src/routes/adminOrdersRoutes.ts
import { Router } from "express";
import db from "../db";
import { orders } from "../schema/orders";

const adminOrdersRouter = Router();

adminOrdersRouter.get("/", async (req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      with: {
        seller: {
          columns: {
            businessName: true,
          },
        },
        deliveryBoy: {
          columns: {
            name: true,
          },
        },
      },
    });
    res.status(200).json(allOrders);
  } catch (error: any) {
    console.error("Failed to fetch all orders for admin:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default adminOrdersRouter;
