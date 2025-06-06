import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/client";

const router = Router();

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      userId,
      businessName,
      businessAddress,
      phoneNumber,
      // ज़रूरी और जो भी fields हैं वो यहाँ लें
    } = req.body;

    if (!userId || !businessName || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // पहले चेक करो कि user ने पहले से apply किया है या seller है या नहीं
    const existingSeller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (existingSeller) {
      return res
        .status(400)
        .json({ message: "Seller application already exists or approved." });
    }

    const newSellerApplication = await prisma.seller.create({
      data: {
        userId,
        businessName,
        businessAddress,
        phoneNumber,
        approvalStatus: "pending",
        appliedAt: new Date(),
      },
    });

    res.status(201).json({ message: "Seller application submitted", newSellerApplication });
  } catch (error) {
    next(error);
  }
});

export default router;
