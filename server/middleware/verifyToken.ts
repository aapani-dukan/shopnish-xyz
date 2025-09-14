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

  console.log("🔍 [verifyToken] Incoming Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ [verifyToken] No valid token provided');
    return res.status(401).json({ message: 'No valid token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // ✅ Firebase Admin SDK से verify
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    console.log("✅ [verifyToken] Decoded Token UID:", decodedToken.uid);

    // ✅ DB से user जानकारी निकालें
    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, decodedToken.uid));
    if (!dbUser) {
      console.error("❌ [verifyToken] User not found in database for UID:", decodedToken.uid);
      return res.status(404).json({ message: 'User not found in database' });
    }

    req.user = {
      id: dbUser.id,
      firebaseUid: decodedToken.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      approvalStatus: dbUser.approvalStatus,
    };

    console.log("✅ [verifyToken] User attached to request:", req.user);

    next();
  } catch (error: any) {
    console.error('❌ [verifyToken] Error verifying token:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
