import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage";
import { AuthenticatedRequest, AuthenticatedUser } from '@/shared/types/auth';
// Middleware to verify Firebase token
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decoded = await verifyAndDecodeToken(idToken); // Firebase decoded token

    const dbSeller = await storage.getSellerByUserFirebaseUid(decoded.uid);

    req.user = {
      userId: decoded.uid,
      email: decoded.email ?? dbSeller?.email,
      name: (decoded as any)?.name ?? dbSeller?.businessName,
      id: dbSeller?.id,
      role: "seller", // Right now only used for seller paths
    };

    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
