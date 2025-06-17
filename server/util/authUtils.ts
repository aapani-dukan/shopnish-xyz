// server/utils/authUtils.ts
import admin from "firebase-admin";

export async function verifyAndDecodeToken(idToken: string) {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const userRecord = await admin.auth().getUser(decodedToken.uid);
  return {
    uid: userRecord.uid,
    email: userRecord.email || "",
    name: userRecord.displayName || "",
  };
}
