// middleware/verify-token.ts
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

// Make sure Firebase Admin is already initialized in your app

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken; // ✅ Firebase UID and info accessible here
    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
