// routes/authRoutes.ts

import express from "express";
import { verifyAndDecodeToken } from "../server/util/authUtils"; // नई यूटिलिटी फ़ाइल इम्पोर्ट करें

const router = express.Router();

/**
 * 🔐 GET /api/auth/me
 * Verifies Firebase ID token from Authorization header
 * and returns basic user info.
 */
router.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token format" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const userInfo = await verifyAndDecodeToken(idToken); // यूटिलिटी फ़ंक्शन का उपयोग करें

    return res.status(200).json({
      uid: userInfo.uid,
      email: userInfo.email,
      name: userInfo.name,
    });
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
