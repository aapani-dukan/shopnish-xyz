// routes/sellers/approve.ts
import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/client";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        approvalStatus: "approved",
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    res.json(updatedSeller);
  } catch (error) {
    next(error);
  }
});

export default router;
