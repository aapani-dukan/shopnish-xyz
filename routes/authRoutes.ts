// routes/authRoutes.ts

import express from "express";
import admin from "firebase-admin";

const router = express.Router();

router.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 👉 अगर आप अपने DB में यूज़र का डेटा रखते हैं (जैसे Prisma में), तो यहां से निकालिए:
    // const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

    // या Firebase user से सीधे data निकालिए
    const userRecord = await admin.auth().getUser(uid);

    return res.status(200).json({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
