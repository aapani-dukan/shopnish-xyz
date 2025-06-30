import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage";

// Allowed roles in system
export type UserRole = "customer" | "seller" | "admin" | "delivery";

// Type used in all authenticated routes
export interface AuthenticatedUser {
  userId: string;         // Firebase UID
  email?: string;
  name?: string;
  id?: number;            // Internal DB ID (like seller.id)
  role?: UserRole;
}

// Request with attached user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

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

    // Lookup user in your own database (seller table, etc.)
    const dbSeller = await storage.getSellerByUserFirebaseUid(decoded.uid);

    // Attach verified user to request
    req.user = {
      userId: decoded.uid,
      email: decoded.email ?? dbSeller?.email,
      name: (decoded as any)?.name ?? dbSeller?.businessName,
      id: dbSeller?.id,
      role: "seller", // For now assume seller login path uses this middleware
    };

    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
