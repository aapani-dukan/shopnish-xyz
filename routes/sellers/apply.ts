import { Router, Request, Response, NextFunction } from "express";

const router = Router();

// Dummy in-memory sellers array
const fakeSellers: any[] = [];

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userId,
      businessName,
      businessAddress,
      phoneNumber,
    } = req.body;

    if (!userId || !businessName || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingSeller = fakeSellers.find((s) => s.userId === userId);

    if (existingSeller) {
      return res.status(400).json({
        message: "Seller application already exists or approved.",
      });
    }

    const newSellerApplication = {
      id: (fakeSellers.length + 1).toString(),
      userId,
      businessName,
      businessAddress,
      phoneNumber,
      approvalStatus: "pending",
      appliedAt: new Date(),
    };

    fakeSellers.push(newSellerApplication);

    res.status(201).json({
      message: "Seller application submitted",
      newSellerApplication,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
