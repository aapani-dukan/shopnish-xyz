// src/routes/adminOrdersRoutes.ts
import { Router } from "express";
import { db } from "../../db";
import { orders } from "../../../shared/backend/schema";

const adminOrdersRouter = Router();

adminOrdersRouter.get("/", async (req, res) => {
  try {
    const allOrders = await db.query.orders.findMany({
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        total: true,
        deliveryAddress: true,
        createdAt: true,
        updatedAt: true,
      },
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
      orderBy: (orders, { desc }) => [desc(orders.createdAt)], // ✅ latest orders first
    });

    res.status(200).json(allOrders);
  } catch (error: any) {
    console.error("❌ Failed to fetch all orders for admin:", error.message);
    res.status(500).json({ error: "Internal server error while fetching orders." });
  }
});

export default adminOrdersRouter;
