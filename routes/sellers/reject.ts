import { Router, Request, Response, NextFunction } from "express";

const router = Router();

// Dummy in-memory database object for sellers (for demo purposes)
const fakeSellers: any[] = [
  { id: "1", name: "Demo Seller", approvalStatus: "pending" },
  // अन्य sellers जोड़ सकते हैं यहां
];

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId, reason } = req.body;

    if (!sellerId || !reason) {
      return res.status(400).json({ message: "sellerId and reason are required" });
    }

    const sellerIndex = fakeSellers.findIndex((s) => s.id === sellerId);

    if (sellerIndex === -1) {
      return res.status(404).json({ message: "Seller not found" });
    }

    fakeSellers[sellerIndex] = {
      ...fakeSellers[sellerIndex],
      approvalStatus: "rejected",
      rejectionReason: reason,
      approvedAt: null,
    };

    res.json(fakeSellers[sellerIndex]);
  } catch (error) {
    next(error);
  }
});

export default router;
