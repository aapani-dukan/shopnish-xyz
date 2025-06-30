import admin from "firebase-admin";
import serviceAccount from "../../FIREBASE_PRIVATE_KEY.json" assert { type: "json" }; // only in ESM

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
