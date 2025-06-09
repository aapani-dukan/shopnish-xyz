import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers } from "../../shared/schema";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingSellers = await db.query.sellers.findMany({
      where: sellers.approvalStatus.eq("pending"),
      orderBy: (seller) => seller.appliedAt.desc(),
    });

    res.json(pendingSellers);
  } catch (error) {
    next(error);
  }
});

export default router;
