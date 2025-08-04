// server/middleware/verifyToken.ts
import { Request, Response, NextFunction } from 'express';
import { authAdmin } from '../lib/firebaseAdmin.ts';
import { db } from '../db.ts';
import { users } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../shared/types/user.ts';

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // ... अन्य कोड

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    console.log("VerifyToken: Token successfully verified. UID:", decodedToken.uid);

    // ✅ Fetch user from DB and merge with decoded token data
    const [dbUser] = await db.select().from(users).where(eq(users.uuid, decodedToken.uid));
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    // ✅ req.user को पूरी जानकारी के साथ अपडेट करें
    req.user = {
      id: dbUser.id,
      uuid: decodedToken.uid,
      email: decodedToken.email,
      name: dbUser.name,
      role: dbUser.role, // ✅ यहाँ role जोड़ें
      approvalStatus: dbUser.approvalStatus, // ✅ यहाँ approvalStatus जोड़ें
    };

    next(); // ✅ All good
  } catch (error: any) {
    console.error('VerifyToken: टोकन सत्यापन विफल रहा:', error.message);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'टोकन की समय सीमा समाप्त हो गई है' });
    }
    return res.status(401).json({ message: 'अमान्य टोकन या सत्यापन विफल रहा' });
  }
};
