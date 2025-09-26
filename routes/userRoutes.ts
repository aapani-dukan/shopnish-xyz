import { Router, Request, Response } from 'express';
import { db } from '../server/db.ts';
import { users, userRoleEnum, sellersPgTable } from '../shared/backend/schema.ts'; // ✅ sellerProfiles को आयात करें
import { eq } from 'drizzle-orm';
import { authAdmin } from '../server/lib/firebaseAdmin.ts';

const userLoginRouter = Router();

userLoginRouter.post("/login", async (req: Request, res: Response) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: "ID Token is required." });
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const firebaseUid = decodedToken.uid;
        const email = decodedToken.email;
        const name = decodedToken.name || null;

        // ✅ Drizzle का उपयोग करके डेटाबेस में उपयोगकर्ता को खोजें और विक्रेता प्रोफ़ाइल को शामिल करें
        const user = await db.query.users.findFirst({
            where: eq(users.firebaseUid, firebaseUid),
            with: {
                sellerProfile: true,
            },
        });

        if (!user) {
            const nameParts = name ? name.split(' ') : [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const [newUser] = await db.insert(users).values({
                firebaseUid: firebaseUid,
                email: email,
                name: name,
                role: userRoleEnum.enumValues[0],
                password: '',
                firstName: firstName,
                lastName: lastName,
                phone: '',
                address: '',
            }).returning();
            
            console.log("✅ नया उपयोगकर्ता डेटाबेस में जोड़ा गया।");

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
            const customToken = await authAdmin.createCustomToken(user.firebaseUid);
            const expiresIn = 60 * 60 * 24 * 5 * 1000;

            res.cookie('__session', customToken, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            });

            // ✅ उपयोगकर्ता और उसकी विक्रेता प्रोफ़ाइल (यदि मौजूद हो) को भेजें
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
