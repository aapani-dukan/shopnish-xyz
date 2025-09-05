// server/routes/orderRoutes.ts

import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../server/middleware/authMiddleware";
import { placeOrder } from "../server/controllers/orderController";
import { getUserOrders } from "../server/controllers/orderController";
import { getIO } from "../server/socket";

const ordersRouter = Router();

// ✅ Cart से order place करने के लिए
ordersRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // placeOrder function को cartOrder=true के साथ call करें
    const order = await placeOrder(req, res, { cartOrder: true });

    // Socket.IO event
    getIO().emit("orders:updated", {
      message: "New order placed",
      order,
    });
  } catch (err: any) {
    console.error("❌ placeOrder error:", err);
    res.status(500).json({ message: err.message || "Failed to place order" });
  }
});

// ✅ Direct Buy Now
ordersRouter.post("/buy-now", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // placeOrder function को cartOrder=false के साथ call करें
    const order = await placeOrder(req, res, { cartOrder: false });

    // Socket.IO event
    getIO().emit("orders:updated", {
      message: "New buy-now order placed",
      order,
    });
  } catch (err: any) {
    console.error("❌ Buy-now order error:", err);
    res.status(500).json({ message: err.message || "Failed to place order" });
  }
});

// ✅ Logged-in user के orders fetch करने के लिए
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
