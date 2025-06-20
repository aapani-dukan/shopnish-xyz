// server/middleware/verifyToken.ts

import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
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
    const decoded = await verifyAndDecodeToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.displayName || "",
    };
    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
