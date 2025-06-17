// server/middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../utils/authUtils"; // नई यूटिलिटी फ़ाइल इम्पोर्ट करें

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
    req.user = await verifyAndDecodeToken(idToken); // यूटिलिटी फ़ंक्शन का उपयोग करें
    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
