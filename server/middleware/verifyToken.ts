// server/middleware/verifyToken.ts

import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage"; // ✅ storage इम्पोर्ट करें


export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    id?: number; // डेटाबेस ID
    role?: 'customer' | 'seller' | 'admin' | 'delivery'; // ✅ भूमिका जोड़ें
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
    const decoded = await verifyAndDecodeToken(idToken); // यह Firebase decoded token है

  
    const dbUser = await storage.getUserByFirebaseUid(decoded.uid);

    if (!dbUser) {
      console.warn(`User with Firebase UID ${decoded.uid} not found in database during token verification. They might be a new user not yet registered via /api/auth/login.`);
      // यदि dbUser नहीं मिलता है, तो आप अभी भी प्रमाणीकरण को पास कर सकते हैं
      // लेकिन बिना DB ID या भूमिका के। यह `/api/auth/login` जैसे सार्वजनिक रूट्स के लिए ठीक है
      // जहां आप यूज़र को बनाना चाहते हैं। प्रतिबंधित रूट्स के लिए, यह एक समस्या होगी।
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.displayName || "",
      id: dbUser ? dbUser.id : undefined,
      role: dbUser ? dbUser.role : undefined, // ✅ यहाँ यूज़र की भूमिका असाइन करें
    };
    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


