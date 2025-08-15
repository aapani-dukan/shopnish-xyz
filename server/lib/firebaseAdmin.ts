// server/lib/firebaseAdmin.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage'; // ✅ इस लाइन को जोड़ें

console.log("--- Firebase ENV VARs Check ---");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY present:", !!process.env.FIREBASE_PRIVATE_KEY);
if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("FIREBASE_PRIVATE_KEY length:", process.env.FIREBASE_PRIVATE_KEY.length);
    console.log("FIREBASE_PRIVATE_KEY start:", process.env.FIREBASE_PRIVATE_KEY.substring(0, 30));
    console.log("FIREBASE_PRIVATE_KEY end:", process.env.FIREBASE_PRIVATE_KEY.substring(process.env.FIREBASE_PRIVATE_KEY.length - 30));
}
console.log("-------------------------------");

const firebaseApps = getApps();
let app;

if (!firebaseApps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("❌ ERROR: Missing Firebase environment variables (FIREBASE_PROJECT_ID, PRIVATE_KEY, or CLIENT_EMAIL).");
    process.exit(1);
  }

  app = initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: `${serviceAccount.projectId}.appspot.com`, // ✅ storageBucket जोड़ें
  });
  console.log('✅ Firebase Admin SDK initialized successfully.');
} else {
  app = firebaseApps[0];
  console.log('✅ Firebase Admin SDK already initialized.');
}

// ✅ authAdmin और storageAdmin दोनों को एक्सपोर्ट करें
export const authAdmin = getAuth(app);
export const storageAdmin = getStorage(app);
