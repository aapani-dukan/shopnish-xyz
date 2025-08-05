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

  // ✅ 1. Authorization हेडर की जांच करें
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No valid token provided' });
  }

  // ✅ 2. टोकन को हेडर से निकालें
  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    
    // ✅ 3. डेटाबेस से user की जानकारी fetch करें
    const [dbUser] = await db.select().from(users).where(eq(users.uuid, decodedToken.uid));
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    // ✅ 4. req.user ऑब्जेक्ट को पूरी जानकारी से अपडेट करें
    req.user = {
      id: dbUser.id,
      uuid: decodedToken.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      approvalStatus: dbUser.approvalStatus,
    };

    next();
  } catch (error: any) {
    console.error('VerifyToken: टोकन सत्यापन विफल रहा:', error.message);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'टोकन की समय सीमा समाप्त हो गई है' });
    }
    return res.status(401).json({ message: 'अमान्य टोकन या सत्यापन विफल रहा' });
  }
};
