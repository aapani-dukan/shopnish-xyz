// server/util/authUtils.ts

import admin from "firebase-admin";

/**
 * Safe Firebase-Admin initialization.
 * इससे "The default Firebase app already exists" और
 * "application default credentials" वाली दिक्कत नहीं आएगी।
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase environment variables");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

/**
 * Verify the Firebase ID token sent from the frontend.
 * @param token Bearer token from the client
 * @returns decoded payload if valid; otherwise throws
 */
export async function verifyAndDecodeToken(token: string) {
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (err) {
    console.error("Firebase token verification failed:", err);
    throw new Error("Invalid or expired token");
  }
}
