import express from "express";
import { storage } from "../../storage";

const router = express.Router();

// ✅ केवल सभी products fetch करने का रूट रखें
router.get("/", async (_req, res) => {
  try {
    const products = await storage.getProducts(); // या storage.getAllProducts() अगर आपने उसे ऐसे नाम दिया हो
    res.json(products);
  } catch (error) {
    console.error("Error fetching all products for admin:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
});

export default router;
