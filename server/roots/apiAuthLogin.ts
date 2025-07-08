// server/roots/apiAuthLogin.ts

import { Router } from 'express';
import * as admin from 'firebase-admin'; // Firebase Admin SDK इम्पोर्ट करें
import { db } from '../db'; // आपके db इंस्टेंस का पाथ एडजस्ट करें (यह server/db.ts होगा)
import { users } from '../../shared/backend/schema'; // आपके users स्कीमा का पाथ एडजस्ट करें (यह ../../shared/backend/schema.ts होगा)
import { eq } from 'drizzle-orm';

const router = Router();

// 🚀 POST /login एंडपॉइंट (यह /api/auth के बाद आएगा)
router.post('/login', async (req, res) => {
  console.log("Backend: POST /api/auth/login received.");

  const authHeader = req.headers.authorization;

  // 1. Authorization हेडर की जांच करें
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error("Backend Error: Authorization header missing or not starting with 'Bearer '.");
    return res.status(400).json({ message: 'ID token is missing.' });
  }

  const idToken = authHeader.split(' ')[1]; // 'Bearer ' के बाद टोकन निकालें

  // 2. प्राप्त टोकन के कुछ भाग को लॉग करें (डीबगिंग के लिए)
  console.log("Backend: Extracted ID Token (first 30 chars):", idToken.substring(0, Math.min(idToken.length, 30)));

  try {
    // 3. Firebase Admin SDK का उपयोग करके ID टोकन को सत्यापित करें
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("Backend: Firebase ID Token verified successfully. UID:", decodedToken.uid);

    const { email, name, picture } = decodedToken;
    const firebaseUid = decodedToken.uid;

    // 4. यूजर को डेटाबेस में ढूंढें या बनाएँ
    let userRecord = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);

    if (userRecord.length === 0) {
      // यदि यूजर मौजूद नहीं है, तो उसे बनाएँ
      const [newUser] = await db.insert(users).values({
        firebaseUid,
        email: email || '',
        name: name || email || 'New User',
        role: 'customer', // डिफ़ॉल्ट रोल 'customer'
        profilePicture: picture || null,
        createdAt: new Date(),
      }).returning();
      userRecord = [newUser];
      console.log("Backend: New user created in DB:", newUser);
    } else {
      console.log("Backend: Existing user found in DB:", userRecord[0]);
    }

    // 5. क्लाइंट को सफल प्रतिक्रिया भेजें
    res.status(200).json({
      uuid: userRecord[0].firebaseUid,
      email: userRecord[0].email,
      name: userRecord[0].name,
      role: userRecord[0].role,
      seller: userRecord[0].sellerId ? {
        id: userRecord[0].sellerId,
        approvalStatus: userRecord[0].sellerApprovalStatus
      } : null
    });

  } catch (error: any) {
    // 6. टोकन सत्यापन या डेटाबेस त्रुटियों को हैंडल करें
    console.error("Backend Error: Failed to verify Firebase ID token or process user:", error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired. Please sign in again.' });
    }
    // अन्य Firebase Admin SDK त्रुटियों के लिए भी हैंडलिंग जोड़ें
    return res.status(401).json({ message: 'Unauthorized: Invalid token or verification failed.' });
  }
});

export default router;
