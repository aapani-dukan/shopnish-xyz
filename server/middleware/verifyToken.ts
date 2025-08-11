import { Request, Response, NextFunction } from 'express';
import { authAdmin } from '../lib/firebaseAdmin.ts';
import { db } from '../db.ts';
import { users } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../shared/types/user.ts';
import fetch from 'node-fetch';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No valid token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    let decodedToken;

    try {
      // Try verifying as a normal ID token
      decodedToken = await authAdmin.verifyIdToken(token);
    } catch (err) {
      // If that fails, try exchanging custom token for ID token
      const apiKey = process.env.FIREBASE_API_KEY;
      if (!apiKey) throw new Error("FIREBASE_API_KEY not configured");

      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, returnSecureToken: true }),
      });

      if (!resp.ok) throw new Error("Custom token exchange failed");

      const data = await resp.json();
      const idToken = data.idToken;
      decodedToken = await authAdmin.verifyIdToken(idToken);
    }

    // ✅ DB से user जानकारी
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
    console.error('VerifyToken error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
