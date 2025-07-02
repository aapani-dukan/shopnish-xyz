// server/lib/firebaseAdmin.ts

// ✅ CommonJS मॉड्यूल को ESM में इम्पोर्ट करने का सही तरीका
import pkg from 'firebase-admin';
const { initializeApp, credential, apps, auth: firebaseAuth } = pkg; // auth को firebaseAuth नाम दें ताकि बाद में confusion न हो

if (!apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

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

// ✅ authAdmin को एक्सपोर्ट करें, जो अब firebaseAuth() से आएगा
// सुनिश्चित करें कि यह initializedApp से auth() प्राप्त कर रहा है
const initializedApp = apps.length ? apps[0] : initializeApp({}); // इसे इस तरह से भी हैंडल कर सकते हैं
export const authAdmin = firebaseAuth(initializedApp); // initializedApp से auth सर्विस प्राप्त करें
