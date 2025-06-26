import express from "express";
import { storage } from "../../storage";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const products = await storage.getProducts();
    res.json(products);
  } catch (error) {
    console.error("Error fetching all products for admin:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

router.post("/approve-product/:id", async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ message: "Invalid product ID" });

  try {
    await storage.approveProduct(productId);
    res.json({ message: "Product approved successfully." });
  } catch (error) {
    console.error("Error approving product:", error);
    res.status(500).json({ message: "Failed to approve product." });
  }
});

router.post("/reject-product/:id", async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ message: "Invalid product ID" });

  try {
    await storage.rejectProduct(productId);
    res.json({ message: "Product rejected successfully." });
  } catch (error) {
    console.error("Error rejecting product:", error);
    res.status(500).json({ message: "Failed to reject product." });
  }
});

export default router;
