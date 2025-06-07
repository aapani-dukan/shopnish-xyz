import { Router, Request, Response, NextFunction } from "express";


const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approvedProducts = await prisma.product.findMany({
      where: { approvalStatus: "approved" },
      orderBy: { approvedAt: "desc" },
    });

    res.json(approvedProducts);
  } catch (error) {
    next(error);
  }
});

export default router;
