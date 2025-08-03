import express from "express";
import { approveSeller, getPendingSellers, rejectSeller } from "../controllers/adminController";
import { verifyToken, verifyAdmin } from "../../middleware/authMiddleware.ts";

const router = express.Router();

// ✅ Only admin can access these routes
router.use(verifyToken, verifyAdmin);

// GET all pending sellers
router.get("/sellers/pending", getPendingSellers);

// POST approve seller
router.post("/sellers/approve", approveSeller);

// POST reject seller
router.post("/sellers/reject", rejectSeller);

// Example Admin Dashboard route (optional)
router.get("/dashboard", (req, res) => {
  res.json({ message: "Welcome to Admin Dashboard!" });
});

export default router;
