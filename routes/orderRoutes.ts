// server/routes/orderRoutes.ts
import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../server/middleware/authMiddleware";
import { placeOrder, getUserOrders } from "../server/controllers/orderController";
import { getIO } from "../server/socket";

const ordersRouter = Router();

// ✅ Cart से order place करने के लिए
ordersRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // placeOrder को cartOrder=true के साथ call करें
    const order = await placeOrder(req, res, { cartOrder: true });

    // Socket.IO event emit
    getIO().emit("orders:updated", {
      message: "New cart order placed",
      order,
    });

    // Response send करें
    res.status(201).json({
      message: "Cart order placed successfully",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err: any) {
    console.error("❌ Cart order error:", err);
    res.status(500).json({ message: err.message || "Failed to place cart order" });
  }
});

// ✅ Direct Buy Now
ordersRouter.post("/buy-now", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // placeOrder को cartOrder=false के साथ call करें
    const order = await placeOrder(req, res, { cartOrder: false });

    // Socket.IO event emit
    getIO().emit("orders:updated", {
      message: "New buy-now order placed",
      order,
    });

    // Response send करें
    res.status(201).json({
      message: "Buy-now order placed successfully",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err: any) {
    console.error("❌ Buy-now order error:", err);
    res.status(500).json({ message: err.message || "Failed to place buy-now order" });
  }
});

// ✅ Logged-in user के orders fetch करने के लिए
ordersRouter.get("/", requireAuth, getUserOrders);

export default ordersRouter;
