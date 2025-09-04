import { Router, Request, Response } from "express";

const orderdBoyRouter = Router();

// Example route
orderdBoyRouter.get("/orders", async (req: Request, res: Response) => {
  res.send("Delivery boy orders");
});

// ✅ Default export जरूरी है
export default orderdBoyRouter;
