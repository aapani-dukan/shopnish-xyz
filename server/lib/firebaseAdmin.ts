// server/lib/firebaseAdmin.ts

// ✅ 'firebase-admin' से सीधे initializeApp, credential, और apps इम्पोर्ट करें
//    यह 'firebase-admin/app' सब-मॉड्यूल से आता है, जो ESM संगतता के लिए बेहतर है।
import { initializeApp, cert, getApps } from 'firebase-admin/app'; // यहां 'credential.cert' के बजाय सीधा 'cert' इम्पोर्ट करें
import { getAuth } from 'firebase-admin/auth'; // auth सर्विस को अलग से इम्पोर्ट करें

// ✅ आपके console.log स्टेटमेंट्स यहाँ रहने दें, वे अब उपयोगी हैं
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


// ✅ 'apps' के बजाय 'getApps()' का उपयोग करें
const apps = getApps(); // सक्रिय Firebase ऐप्स की लिस्ट प्राप्त करें

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
    credential: cert(serviceAccount as any), // ✅ अब 'cert' फंक्शन का सीधे उपयोग करें
  });
  console.log('✅ Firebase Admin SDK initialized successfully.');
} else {
  console.log('✅ Firebase Admin SDK already initialized.');
}

// ✅ authAdmin को एक्सपोर्ट करें, जो अब getAuth() से आएगा
const initializedApp = apps.length ? apps[0] : initializeApp({}); // यह सुनिश्चित करें कि यह हमेशा एक इनिशियलाइज़्ड ऐप इंस्टेंस प्राप्त करता है
export const authAdmin = getAuth(initializedApp); // initializedApp से auth सर्विस प्राप्त करें
