import * as admin from "firebase-admin";

/**
 * Safe Firebase Admin SDK initialization:
 * इससे "The default Firebase app already exists" या
 * "Missing credentials" जैसी errors नहीं आएंगी।
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Missing Firebase environment variables.");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log("✅ Firebase Admin initialized inside authUtils.ts");
}

/**
 * Verifies and decodes a Firebase ID token.
 * @param token - The Firebase ID token from the client (Bearer token)
 * @returns Decoded token if valid
 * @throws Error if token is invalid or expired
 */
export async function verifyAndDecodeToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error);
    throw new Error("Invalid or expired token");
  }
}
