import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../server/db";
import { sellers } from "../../shared/backend/schema";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, businessName, businessAddress, phoneNumber } = req.body;

    if (!userId || !businessName || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if seller already applied or approved
    const existingSeller = await db.query.sellers.findFirst({
      where: sellers.userId.eq(userId),
    });

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
      });
    }

    // Insert new seller application with pending status
    const newSellerApplication = await db.insert(sellers).values({
      userId,
      businessName,
      businessAddress,
      phoneNumber,
      approvalStatus: "pending",
      appliedAt: new Date(),
    }).returning();

    res.status(201).json({
      message: "Seller application submitted",
      newSellerApplication,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
