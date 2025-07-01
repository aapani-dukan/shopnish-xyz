import * as admin from "firebase-admin";

export async function verifyAndDecodeToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error);
    throw new Error("Invalid or expired token");
  }
}
