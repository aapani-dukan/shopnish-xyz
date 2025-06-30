import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage"; // ✅ DB access layer

export type UserRole = 'customer' | 'seller' | 'admin' | 'delivery';

export interface AuthenticatedUser {
  userId: string;         // Firebase UID (Always)
  email?: string;
  name?: string;
  id?: number;            // Internal DB ID (seller ID)
  role?: UserRole;        // Optional but useful
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

    // ⛏️ Important: Pull matching seller from DB
    const dbSeller = await storage.getSellerByUserFirebaseUid(decoded.uid);

    // ✅ Construct unified AuthenticatedUser object
    req.user = {
      userId: decoded.uid,
      email: decoded.email ?? dbSeller?.email ?? undefined,
      name: (decoded as any)?.name ?? undefined, // Firebase user.name isn't guaranteed
      id: dbSeller?.id,
      role: "seller", // For now assume only sellers go through this middleware
    };

    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
