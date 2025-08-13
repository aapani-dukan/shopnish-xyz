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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ No valid token provided');
    return res.status(401).json({ message: 'No valid token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // ✅ ID टोकन को सीधे Firebase Admin SDK से वेरीफाई करें
    const decodedToken = await authAdmin.verifyIdToken(idToken);

    // ✅ DB से user जानकारी निकालें
    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, decodedToken.uid));
    if (!dbUser) {
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

    next();
  } catch (error: any) {
    console.error('❌ VerifyToken error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
