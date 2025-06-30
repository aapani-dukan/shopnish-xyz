// server/lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("FIREBASE_PRIVATE_KEY is not defined in environment.");
  }

  // Parse JSON from environment
  const serviceAccount = JSON.parse(privateKey);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
