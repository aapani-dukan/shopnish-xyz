// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";

const router = Router();

// Dummy in-memory sellers array (shared)
const fakeSellers: any[] = [];

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    const sellerIndex = fakeSellers.findIndex((seller) => seller.id === sellerId);

    if (sellerIndex === -1) {
      return res.status(404).json({ message: "Seller not found" });
    }

    fakeSellers[sellerIndex] = {
      ...fakeSellers[sellerIndex],
      approvalStatus: "approved",
      approvedAt: new Date(),
      rejectionReason: null,
    };

    res.json(fakeSellers[sellerIndex]);
  } catch (error) {
    next(error);
  }
});

export default router;
