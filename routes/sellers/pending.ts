// routes/sellers/pending.ts
import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/client";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingSellers = await prisma.seller.findMany({
      where: { approvalStatus: "pending" },
      orderBy: { createdAt: "desc" },
    });

    res.json(pendingSellers);
  } catch (error) {
    next(error);
  }
});

export default router;
