// server/middleware/verifyToken.ts
import { Request, Response, NextFunction } from 'express'; // 'res' और 'next' के लिए NextFunction इम्पोर्ट करें
// import jwt from 'jsonwebtoken'; // ❌ इस लाइन को हटा दें
import { authAdmin } from '../lib/firebaseAdmin.js'; // ✅ firebaseAdmin इम्पोर्ट करें
import { db } from '../db.js'; // Assuming db is relative
import { users } from '@/shared/backend/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '@/shared/types/auth'; // Ensure this path is correct
// import { storage } from '../storage.js'; // ✅ आपको storage.js की अब जरूरत नहीं है, क्योंकि हम सीधे डीकोडेड टोकन से UID लेंगे


// Define AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => { // 'res' और 'next' के लिए टाइप जोड़ें
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) {
    return res.status(401).json({ message: 'Token not found' });
  }

  try {
    // ✅ यहाँ मुख्य बदलाव: Firebase Admin SDK का उपयोग करके ID टोकन को वेरिफाई करें
    const decodedToken = await authAdmin.verifyIdToken(token);

    // Firebase UID डीकोडेड टोकन से सीधे उपलब्ध है
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email; // ईमेल भी यहीं से मिलेगा
    const displayName = decodedToken.name || null; // नाम

    // डेटाबेस से यूजर को Fetch करें ताकि उसकी भूमिका और अन्य अपडेटेड जानकारी मिल सके
    // यदि आपकी `users` टेबल में `uuid` कॉलम `firebaseUid` को स्टोर करता है
    const [userRecord] = await db.select().from(users).where(eq(users.uuid, firebaseUid));

    if (!userRecord) {
      // यह स्थिति तब आ सकती है जब Firebase Auth में यूजर है लेकिन हमारे DB में नहीं (जो नहीं होना चाहिए अगर login /auth/login सही है)
      return res.status(401).json({ message: 'User not found in database or not fully onboarded' });
    }

    req.user = {
      id: userRecord.id,
      firebaseUid: userRecord.uuid, // DB से uuid (जो firebaseUid है)
      email: userRecord.email,
      role: userRecord.role,
      approvalStatus: userRecord.approvalStatus,
      name: userRecord.name, // डेटाबेस से नाम लें
      // अन्य आवश्यक गुण यहाँ जोड़ें
    };
    next();
  } catch (error: any) {
    console.error('Token verification failed:', error);
    // Firebase Admin SDK से आने वाली विशिष्ट त्रुटियों को संभालें
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired' });
    }
    // 'auth/argument-error' या अन्य अमान्य टोकन त्रुटियों के लिए
    return res.status(401).json({ message: 'Invalid token or verification failed' });
  }
};
