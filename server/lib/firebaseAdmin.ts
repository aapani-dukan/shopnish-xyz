// server/lib/firebaseAdmin.ts

import firebaseAdmin from 'firebase-admin';

// ✅ ये लॉग्स जोड़ें
console.log("--- Firebase ENV VARs Check ---");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
// PRIVATE_KEY की पूरी वैल्यू लॉग न करें, केवल यह जांचें कि यह मौजूद है या नहीं
console.log("FIREBASE_PRIVATE_KEY present:", !!process.env.FIREBASE_PRIVATE_KEY);
// अगर PRIVATE_KEY मौजूद है, तो इसकी कुछ लंबाई लॉग करें, ताकि पता चले कि यह खाली नहीं है
if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log("FIREBASE_PRIVATE_KEY length:", process.env.FIREBASE_PRIVATE_KEY.length);
    // प्राइवेट की की शुरुआत और अंत के कुछ कैरेक्टर भी देख सकते हैं
    console.log("FIREBASE_PRIVATE_KEY start:", process.env.FIREBASE_PRIVATE_KEY.substring(0, 30));
    console.log("FIREBASE_PRIVATE_KEY end:", process.env.FIREBASE_PRIVATE_KEY.substring(process.env.FIREBASE_PRIVATE_KEY.length - 30));
}
console.log("-------------------------------");


const { initializeApp, credential, apps, auth: firebaseAuth } = firebaseAdmin;

if (!apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // ✅ यह सुनिश्चित करें कि यह 'clientEmail' है, न कि 'client_email'
  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("❌ ERROR: Missing Firebase environment variables (FIREBASE_PROJECT_ID, PRIVATE_KEY, or CLIENT_EMAIL).");
    process.exit(1);
  }

  initializeApp({
    credential: credential.cert(serviceAccount as any),
  });
  console.log('✅ Firebase Admin SDK initialized successfully.');
} else {
  console.log('✅ Firebase Admin SDK already initialized.');
}

const initializedApp = apps.length ? apps[0] : initializeApp({});
export const authAdmin = firebaseAuth(initializedApp);
