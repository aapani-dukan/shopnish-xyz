// server/middleware/verifyToken.ts

import { Request, Response, NextFunction } from "express";
import { verifyAndDecodeToken } from "../util/authUtils";
import { storage } from "../storage"; // ✅ storage इम्पोर्ट करें

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    id?: number; // ✅ डेटाबेस ID जोड़ने के लिए इसे वैकल्पिक करें
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

    // ✅ Firebase UID का उपयोग करके डेटाबेस से यूजर को खोजें
    const dbUser = await storage.getUserByFirebaseUid(decoded.uid);

    if (!dbUser) {
      // यदि Firebase UID से कोई यूज़र नहीं मिला, तो यह एक अमान्य स्थिति हो सकती है
      // या यूज़र ने अभी तक हमारे सिस्टम में रजिस्टर नहीं किया है (जैसे कि /api/auth/login से पहले)।
      // आप यहां 403 या 404 भी लौटा सकते हैं, या बस `id` को undefined छोड़ सकते हैं।
      console.warn(`User with Firebase UID ${decoded.uid} not found in database during token verification.`);
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.displayName || "",
      id: dbUser ? dbUser.id : undefined, // ✅ यहाँ डेटाबेस ID असाइन करें
    };
    next();
  } catch (error: any) {
    console.error("❌ Firebase token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
