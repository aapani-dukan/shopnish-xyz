// server/middleware/requireAuth.ts
import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from './verifyToken.js';

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  console.log("requireAuth: Checking authentication...");
  console.log("requireAuth: req.user मौजूद है?", !!req.user); // जांचें कि req.user एक ऑब्जेक्ट है
  console.log("requireAuth: req.user.id क्या है?", req.user?.id); // req.user.id की वैल्यू प्रिंट करें

  if (!req.user || !req.user.id) {
    console.error("requireAuth: उपयोगकर्ता प्रमाणित नहीं है या ID गुम है। 401 भेज रहा है।");
    return res.status(401).json({ message: "User not authenticated." });
  }
  console.log("requireAuth: उपयोगकर्ता प्रमाणित है। अगले मिडलवेयर पर जा रहा है।");
  next();
}
