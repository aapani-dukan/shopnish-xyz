// server/middleware/verifyToken.ts
import { Request, Response, NextFunction } from 'express';
import { authAdmin } from '../lib/firebaseAdmin.ts';
import { db } from '../db.ts';
import { users } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../shared/types/user.ts';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log("VerifyToken: Received Authorization Header:", authHeader); // ✅ नया लॉग

  if (!authHeader) {
    console.warn("VerifyToken: No Authorization token provided."); // ✅ नया लॉग
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  console.log("VerifyToken: Extracted Token (first 20 chars):", token ? token.substring(0, 20) + "..." : "undefined or null"); // ✅ नया लॉग

  if (!token) {
    console.warn("VerifyToken: Token not found after splitting Authorization header."); // ✅ नया लॉग
    return res.status(401).json({ message: 'Token not found' });
  }

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    console.log("VerifyToken: Token successfully verified. UID:", decodedToken.uid); // ✅ नया लॉग
    // ... बाकी कोड
  } catch (error: any) {
    // ✅ यहाँ त्रुटि कोड और मैसेज को स्पष्ट रूप से लॉग करें
    console.error('VerifyToken: टोकन सत्यापन विफल रहा:', error.code, error.message);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'टोकन की समय सीमा समाप्त हो गई है' });
    }
    // यह सामान्य एरर मैसेज है जो अब क्लाइंट पर दिखेगा
    return res.status(401).json({ message: 'अमान्य टोकन या सत्यापन विफल रहा' });
  }
};
