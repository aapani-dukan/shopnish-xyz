
// server/lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error("Missing Firebase environment variables (FIREBASE_PROJECT_ID, PRIVATE_KEY, or CLIENT_EMAIL).");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default admin;
