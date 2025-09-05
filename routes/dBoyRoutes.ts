import { Router, Request, Response } from "express";
import { db } from "../server/db";
import { orders, users, userRoleEnum } from "../shared/backend/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * ✅ POST /api/delivery/login
 * Delivery boy login using Firebase UID
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { firebaseUid, email, name } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: "Missing firebaseUid or email" });
    }

    // ✅ check if user already exists
    let [deliveryUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid));

    if (!deliveryUser) {
      // ✅ create delivery boy user if not exists
      const inserted = await db
        .insert(users)
        .values({
          firebaseUid,
          email,
          name,
          role: userRoleEnum.enumValues.delivery, // delivery role
        })
        .returning();

      deliveryUser = inserted[0];
    }

    return res.json({
      message: "Delivery login successful",
      user: {
        id: deliveryUser.id,
        email: deliveryUser.email,
        name: deliveryUser.name,
        role: deliveryUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Delivery login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ GET /api/delivery/all-orders
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
