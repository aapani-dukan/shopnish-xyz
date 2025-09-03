// server/routes/orderRoutes.ts

import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../server/middleware/authMiddleware";
import { getUserOrders, placeOrder } from "../server/controllers/orderController";
import { getIO } from "../socket"; // ✅ socket instance लेने के लिए

const ordersRouter = Router();

// ✅ placeOrder में socket emit भी होगा
ordersRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await placeOrder(req, res);

    // ✅ नया ऑर्डर बनने पर socket event
    getIO().emit("orders:updated", {
      message: "New order placed",
      order,
    });
  } catch (err: any) {
    console.error("❌ placeOrder error:", err);
    res.status(500).json({ message: err.message || "Failed to place order" });
  }
});

// ✅ getUserOrders रूट
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
