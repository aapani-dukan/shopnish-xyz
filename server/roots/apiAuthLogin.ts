// server/roots/apiAuthLogin.ts

import { Router, Request, Response } from 'express';
import { db } from '../db.js'; // db को सही ढंग से इम्पोर्ट करें
import { users, userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema'; // स्कीमा इम्पोर्ट करें
import { authAdmin } from '../lib/firebaseAdmin.js'; // Firebase Admin Auth को इम्पोर्ट करें
import { eq } from 'drizzle-orm'; // Drizzle-orm से eq इम्पोर्ट करें

const apiAuthLoginRouter = Router();

apiAuthLoginRouter.post('/login', async (req: Request, res: Response) => {
  // 1. Authorization हेडर से ID Token निकालें
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Login Error: Authorization header missing or malformed.');
    return res.status(401).json({ message: 'Authorization header (Bearer token) is required.' });
  }

  const idToken = authHeader.split(' ')[1]; // 'Bearer ' के बाद वाला हिस्सा टोकन है

  if (!idToken) {
    console.error('❌ Login Error: ID token is truly missing after splitting header.');
    return res.status(401).json({ message: 'ID token is missing.' });
  }

  // 2. ID Token को वेरीफाई करें
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
  const name = decodedToken.name || decodedToken.email; // Fallback to email if name is not present

  // 3. User को डेटाबेस में चेक/क्रिएट करें
  try {
    let [user] = await db.select().from(users).where(eq(users.uuid, firebaseUid));

    if (!user) {
      // User doesn't exist in our DB, create them
      console.log(`ℹ️ User with UID ${firebaseUid} not found in DB. Creating new user.`);
      const [newUser] = await db.insert(users).values({
        uuid: firebaseUid,
        email: email,
        name: name,
        role: userRoleEnum.enumValues[0], // Default to 'customer'
        approvalStatus: approvalStatusEnum.enumValues[1], // Default to 'approved'
        // आप यहां req.body से अतिरिक्त फ़ील्ड भी जोड़ सकते हैं, जैसे firstName, lastName
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
      }).returning();
      user = newUser;
      console.log('✅ New user created in database:', user.email);
    } else {
      console.log(`✅ User with UID ${firebaseUid} found in DB:`, user.email);
    }

    // 4. Session Cookie बनाएं और सेट करें
    // Firebase ID Token की अधिकतम आयु 1 घंटा है।
    // Session cookie की अधिकतम आयु 5 दिन हो सकती है।
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
    console.log('✅ Session cookie created by Firebase Admin SDK.');

    const options = { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' || false, sameSite: 'Lax' as const };
    res.cookie('__session', sessionCookie, options);
    console.log('✅ Session cookie set in response.');

    // 5. यूजर डेटा के साथ प्रतिक्रिया दें
    // महत्वपूर्ण: फ्रंटएंड को संवेदनशील डेटा न भेजें।
    res.status(200).json({
      message: 'Login successful and session cookie set.',
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });

  } catch (error: any) {
    console.error('❌ Error during /api/auth/login:', error);
    // 500 Internal Server Error यदि डेटाबेस या कुकी निर्माण में समस्या है
    res.status(500).json({ message: 'Internal server error during login process.', error: error.message });
  }
});

export default apiAuthLoginRouter;
