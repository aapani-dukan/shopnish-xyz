// server/middleware/verifyToken.ts
import { Request, Response, NextFunction } from 'express'; // 'res' और 'next' के लिए NextFunction इम्पोर्ट करें
// import jwt from 'jsonwebtoken'; // ❌ इस लाइन को हटा दें
import { authAdmin } from '../lib/firebaseAdmin.ts'; // ✅ firebaseAdmin इम्पोर्ट करें
import { db } from '../db.ts'; // Assuming db is relative
import { users } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../../shared/types/user.ts'; // Ensure this path is correct
// import { storage } from '../storage.js'; // ✅ आपको storage.js की अब जरूरत नहीं है, क्योंकि हम सीधे डीकोडेड टोकन से UID लेंगे


// Define AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    // ...
    const [userRecord] = await db.select().from(users).where(eq(users.uuid, firebaseUid));

    console.log("VerifyToken: DB से उपयोगकर्ता रिकॉर्ड:", userRecord); // यह पहले से ही है, इसे रखें

    if (!userRecord) {
      console.error("VerifyToken: DB में UID के लिए उपयोगकर्ता नहीं मिला:", firebaseUid);
      return res.status(401).json({ message: 'User not found in database or not fully onboarded' });
    }

    // ✅ यहाँ userRecord.id की वैल्यू जांचें
    console.log("VerifyToken: req.user.id के लिए उपयोग किया जा रहा ID:", userRecord.id);

    req.user = {
      id: userRecord.id, // सुनिश्चित करें कि userRecord.id null/undefined नहीं है
      firebaseUid: userRecord.uuid,
      email: userRecord.email,
      role: userRecord.role,
      approvalStatus: userRecord.approvalStatus,
      name: userRecord.name,
    };
    console.log("VerifyToken: req.user सेट किया गया:", req.user); // पूरे req.user ऑब्जेक्ट को जांचें

    next();
  } catch (error: any) {
    console.error('VerifyToken: टोकन सत्यापन विफल रहा:', error.code, error.message);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'टोकन की समय सीमा समाप्त हो गई है' });
    }
    return res.status(401).json({ message: 'अमान्य टोकन या सत्यापन विफल रहा' });
  }
};
