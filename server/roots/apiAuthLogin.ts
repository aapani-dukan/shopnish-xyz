// server/roots/apiAuthLogin.ts

import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { users, userRoleEnum } from '../../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { authAdmin } from '../lib/firebaseAdmin.ts'; // Firebase Admin SDK

const apiAuthLoginRouter = Router();

apiAuthLoginRouter.post("/admin-login", async (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPasswordHash = process.env.ADMIN_PASSWORD; // यह हैश किया हुआ पासवर्ड होना चाहिए

    if (!adminPasswordHash) {
        console.error("❌ Admin password is not set in environment variables.");
        return res.status(500).json({ error: "Configuration error." });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required." });
    }

    try {
        const isPasswordCorrect = await bcrypt.compare(password, adminPasswordHash);

        if (!isPasswordCorrect) {
            console.warn("Admin login attempt failed. Incorrect password.");
            return res.status(401).json({ error: "Invalid password." });
        }

        const [adminUser] = await db.select().from(users).where(eq(users.role, userRoleEnum.enumValues[2]));
        
        if (!adminUser) {
            console.error("❌ Admin user not found in the database.");
            return res.status(500).json({ error: "Admin account not configured." });
        }
        
        const adminSessionToken = authAdmin.createCustomToken(adminUser.firebaseUid);

        // ✅ यहाँ कुकी कॉन्फ़िगरेशन को अपडेट किया गया है
        res.cookie('__session', adminSessionToken, {
            maxAge: 60 * 60 * 24 * 5 * 1000,
            httpOnly: true,
            // 'SameSite=None' के लिए 'secure' अनिवार्य है
            secure: true, 
            sameSite: 'none', // ✅ यह बदलाव सबसे महत्वपूर्ण है
        });
        
        console.log("✅ Admin logged in and session token created.");
        return res.status(200).json({ message: "Admin logged in successfully." });

    } catch (error: any) {
        console.error("❌ Admin login error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

export default apiAuthLoginRouter;
