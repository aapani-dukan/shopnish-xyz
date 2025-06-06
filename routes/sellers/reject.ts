import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/client"; // सही path

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId, reason } = req.body;

    if (!sellerId || !reason) {
      return res.status(400).json({ message: "sellerId and reason are required" });
    }

    const rejectedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        approvalStatus: "rejected",
        rejectionReason: reason,
        approvedAt: null,
      },
    });

    res.json(rejectedSeller);
  } catch (error) {
    next(error);
  }
});

export default router;
