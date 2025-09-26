// ordersRouter.ts
import { Router } from "express";
import { requireAuth } from "../server/middleware/authMiddleware";
import { placeOrderFromCart, placeOrderBuyNow, getUserOrders, getOrderTrackingDetails } from "../server/controllers/orderController";

const ordersRouter = Router();

// ✅ Cart से order place करने के लिए
// Now we use the controller function directly, without awaiting or handling the response here.
ordersRouter.post("/", requireAuth, placeOrderFromCart);

// ✅ Direct Buy Now
// Same for the buy-now endpoint. The controller handles the full request-response cycle.
ordersRouter.post("/buy-now", requireAuth, placeOrderBuyNow);

// ✅ Logged-in user के orders fetch करने के लिए
ordersRouter.get("/", requireAuth, getUserOrders);
ordersRouter.get("/:orderId/tracking", requireAuth, getOrderTrackingDetails);
export default ordersRouter;
