// routs/userRoutes.ts

import { Router, Request, Response } from 'express';
import { db } from '../server/db.ts';
import { users, userRoleEnum } from '../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import { authAdmin } from '../server/lib/firebaseAdmin.ts';

const userLoginRouter = Router();

userLoginRouter.post("/login", async (req: Request, res: Response) => {
    const { idToken } = req.body; // Frontend से Firebase ID Token प्राप्त करें

    if (!idToken) {
        return res.status(400).json({ error: "ID Token is required." });
    }

    try {
        // 1. Firebase Token की जाँच करें और उपयोगकर्ता का UID प्राप्त करें
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const firebaseUid = decodedToken.uid;
        const email = decodedToken.email;
        const name = decodedToken.name || null;

        // 2. डेटाबेस में उपयोगकर्ता को खोजें
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.firebaseUid, firebaseUid));

        // ✅ 3. यहाँ मुख्य लॉजिक आता है: if-else
        if (!user) {
            // अगर उपयोगकर्ता डेटाबेस में नहीं है, तो एक नया रिकॉर्ड बनाएँ
            const [newUser] = await db.insert(users).values({
                firebaseUid: firebaseUid,
                email: email,
                name: name,
                role: userRoleEnum.enumValues[0], // 'customer' या 'user'
                // अन्य डिफ़ॉल्ट फ़ील्ड यहाँ जोड़ें
            }).returning();
            
            console.log("✅ नया उपयोगकर्ता डेटाबेस में जोड़ा गया।");

            // अब नए उपयोगकर्ता के लिए कस्टम टोकन बनाएँ
            const customToken = await authAdmin.createCustomToken(newUser.firebaseUid);
            const expiresIn = 60 * 60 * 24 * 5 * 1000;

            res.cookie('__session', customToken, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });

            return res.status(200).json({
                message: "नया उपयोगकर्ता लॉगिन सफल",
                customToken,
                user: newUser
            });

        } else {
            // अगर उपयोगकर्ता पहले से मौजूद है, तो उसके लिए कस्टम टोकन बनाएँ
            const customToken = await authAdmin.createCustomToken(user.firebaseUid);
            const expiresIn = 60 * 60 * 24 * 5 * 1000;

            res.cookie('__session', customToken, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });

            return res.status(200).json({
                message: "उपयोगकर्ता लॉगिन सफल",
                customToken,
                user: user
            });
        }

    } catch (error: any) {
        console.error("❌ उपयोगकर्ता लॉगिन त्रुटि:", error);
        return res.status(401).json({ error: "Invalid token or login error." });
    }
});

export default userLoginRouter;
