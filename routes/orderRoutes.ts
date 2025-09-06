import { Router } from "express";
import { placeOrderFromCart, placeOrderBuyNow, getUserOrders } from "../controllers/orderController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// ✅ Cart से order place करने के लिए
router.post("/", protect, placeOrderFromCart);

// ✅ Direct "Buy Now" order के लिए
router.post("/buy-now", protect, placeOrderBuyNow);

// ✅ Logged-in user के orders fetch करने के लिए
router.get("/", protect, getUserOrders);

export default router;
