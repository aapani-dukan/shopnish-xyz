// server/util/authUtils.ts

import { getAuth } from "firebase-admin/auth";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";

// Firebase Admin SDK को initialize करें (सिर्फ अगर पहले नहीं हुआ हो)
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

export async function verifyAndDecodeToken(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}
