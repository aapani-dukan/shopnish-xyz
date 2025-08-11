// server/roots/apiAuthLogin.ts

import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { users, userRoleEnum } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { authAdmin } from '../lib/firebaseAdmin.ts';

const apiAuthLoginRouter = Router();

apiAuthLoginRouter.post("/admin-login", async (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPasswordHash = process.env.ADMIN_PASSWORD;

    if (!adminPasswordHash) {
        return res.status(500).json({ error: "Configuration error." });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required." });
    }

    try {
        const isPasswordCorrect = await bcrypt.compare(password, adminPasswordHash);

        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid password." });
        }

        const [adminUser] = await db.select().from(users).where(eq(users.role, userRoleEnum.enumValues[2]));
        
        if (!adminUser) {
            return res.status(500).json({ error: "Admin account not configured." });
        }
        
        // ✅ यहाँ बदलाव है:
        // 1. Firebase Admin SDK का उपयोग करके एक कस्टम टोकन बनाएं।
        const customToken = await authAdmin.createCustomToken(adminUser.firebaseUid);
        
        // 2. इस कस्टम टोकन का उपयोग करके सेशन कुकी बनाएं।
        // (नोट: यह सिर्फ एक उदाहरण है। आमतौर पर, यह तरीका क्लाइंट-साइड से ID टोकन प्राप्त करने के बाद ही किया जाता है।)
        // चूंकि हम एडमिन को सीधे सर्वर पर प्रमाणित कर रहे हैं, हमें इस तरीके का उपयोग करना होगा।
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const adminSessionCookie = await authAdmin.createSessionCookie(customToken, { expiresIn });

        res.cookie('__session', adminSessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        
        console.log("✅ Admin logged in and session token created.");
        return res.status(200).json({ message: "Admin logged in successfully." });

    } catch (error: any) {
        console.error("❌ Admin login error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

export default apiAuthLoginRouter;
