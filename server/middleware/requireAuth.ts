import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from './verifyToken.js'; 
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated." });
  }
  next();
}
