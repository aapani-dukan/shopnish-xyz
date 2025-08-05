// server/roots/apiAuthLogin.ts

import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { users, userRoleEnum, approvalStatusEnum } from '../../shared/backend/schema.ts';
import { authAdmin } from '../lib/firebaseAdmin.ts';
import { eq } from 'drizzle-orm';

const apiAuthLoginRouter = Router();

apiAuthLoginRouter.post('/login', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Login Error: Authorization header missing or malformed.');
    return res.status(401).json({ message: 'Authorization header (Bearer token) is required.' });
  }

  const idToken = authHeader.split(' ')[1];

  if (!idToken) {
    console.error('❌ Login Error: ID token is truly missing after splitting header.');
    return res.status(401).json({ message: 'ID token is missing.' });
  }

  let decodedToken;
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    console.log('✅ ID Token successfully verified by Firebase Admin SDK.');
  } catch (error: any) {
    console.error('❌ Firebase ID Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid or expired ID token.', error: error.message });
  }

  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;
  const name = decodedToken.name || decodedToken.email;

  try {
    // ✅ 1. Drizzle क्वेरी को ठीक करें: uuid की जगह firebaseUid का उपयोग करें
    let [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));

    if (!user) {
      console.log(`ℹ️ User with UID ${firebaseUid} not found in DB. Creating new user.`);
      // ✅ 2. Drizzle insert को ठीक करें: uuid की जगह firebaseUid का उपयोग करें
      const [newUser] = await db.insert(users).values({
        firebaseUid: firebaseUid,
        email: email,
        name: name,
        role: userRoleEnum.enumValues[0],
        approvalStatus: approvalStatusEnum.enumValues[1],
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
      }).returning();
      user = newUser;
      console.log('✅ New user created in database:', user.email);
    } else {
      console.log(`✅ User with UID ${firebaseUid} found in DB:`, user.email);
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
    console.log('✅ Session cookie created by Firebase Admin SDK.');

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' || false, sameSite: 'Lax' as const };
    res.cookie('__session', sessionCookie, options);
    console.log('✅ Session cookie set in response.');

    // ✅ 3. रिस्पॉन्स को ठीक करें: uuid की जगह firebaseUid का उपयोग करें
    res.status(200).json({
      message: 'Login successful and session cookie set.',
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });

  } catch (error: any) {
    console.error('❌ Error during /api/auth/login:', error);
    res.status(500).json({ message: 'Internal server error during login process.', error: error.message });
  }
});

export default apiAuthLoginRouter;
