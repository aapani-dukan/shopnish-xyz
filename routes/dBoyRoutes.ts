import { Router, Request, Response } from "express";
import { db } from "../server/db";
import { orders } from "../shared/backend/schema";

const router = Router();

/**
 * GET /api/delivery/all-orders
 * → Admin ke liye: sabhi orders (with details)
 */
router.get("/all-orders", async (req: Request, res: Response) => {
  try {
    const list = await db.query.orders.findMany({
      with: {
        items: { with: { product: true } },
        seller: true,
        user: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    return res.json({ orders: list });
  } catch (err) {
    console.error("GET /delivery/all-orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

export default router;
