// server/lib/firebaseAdmin.ts
import admin from "firebase-admin";
import serviceAccount from "../../FIREBASE_PRIVATE_KEY.json"; // ✅ सही path दो

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default admin;
