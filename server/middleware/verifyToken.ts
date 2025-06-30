import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage"; // ✅ DB access layer

export type UserRole = 'customer' | 'seller' | 'admin' | 'delivery';

export interface AuthenticatedUser {
  userId: string; // Firebase UID
  email?: string;
  name?: string;
  id?: number;
  role?: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

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
    const decoded = await verifyAndDecodeToken(idToken); // 🔐 Firebase decoded token

    const dbUser = await storage.getSellerByUserFirebaseUid(decoded.uid);

    req.user = {
      userId: decoded.uid,
      email: decoded.email || dbUser?.email,
      name: decoded.name || dbUser?.name,
      id: dbUser?.id,
      role: dbUser?.role || "seller", // ✅ fallback set to "seller"
    };

    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
