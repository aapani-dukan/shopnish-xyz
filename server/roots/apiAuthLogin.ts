// server/roots/apiAuthLogin.ts

import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { users, userRoleEnum, approvalStatusEnum } from '../../shared/backend/schema.ts';
import { authAdmin } from '../lib/firebaseAdmin.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createSessionCookie } from '../lib/sessionCookie.ts'; // ✅ यह फ़ंक्शन आपको बनाना होगा


const apiAuthLoginRouter = Router();

// ✅ नया राउट: एडमिन लॉगिन के लिए
apiAuthLoginRouter.post("/admin-login", async (req: Request, res: Response) => {
    const { password } = req.body;

    // ✅ सुरक्षा: एडमिन का पासवर्ड environment variable से प्राप्त करें
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error("❌ Admin password is not set in environment variables.");
        return res.status(500).json({ error: "Configuration error." });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required." });
    }

    try {
        // ✅ यहाँ bcrypt का उपयोग करके पासवर्ड को environment variable में सेट किए गए पासवर्ड से तुलना करें
        const isPasswordCorrect = await bcrypt.compare(password, adminPassword);

        if (!isPasswordCorrect) {
            console.warn(`Admin login attempt failed. Incorrect password.`);
            return res.status(401).json({ error: "Invalid password." });
        }

        // ✅ यूजर को डेटाबेस में ढूंढें और रोल की जाँच करें
        const [adminUser] = await db.select().from(users).where(eq(users.role, userRoleEnum.enumValues[2])); // assuming 'admin' is the third enum value

        if (!adminUser) {
            console.error("❌ Admin user not found in the database.");
            return res.status(500).json({ error: "Admin account not configured." });
        }

        // ✅ सेशन कुकी बनाएं (यह फ़ंक्शन आपको बनाना होगा)
        const sessionCookie = await createSessionCookie(adminUser.firebaseUid, authAdmin);

        res.cookie('__session', sessionCookie, {
            maxAge: 60 * 60 * 24 * 5 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
        });

        return res.status(200).json({ message: "Admin logged in successfully." });

    } catch (error: any) {
        console.error("❌ Admin login error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});


// ... आपका मौजूदा '/login' राउट यहाँ नीचे है

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
    let [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));

    if (!user) {
      console.log(`ℹ️ User with UID ${firebaseUid} not found in DB. Creating new user.`);
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
