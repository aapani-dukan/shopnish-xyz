// server/lib/firebaseAdmin.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// आपके console.log स्टेटमेंट्स यहाँ रहने दें, वे अब उपयोगी हैं
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

// ✅ यहां मुख्य बदलाव: हम यह सुनिश्चित कर रहे हैं कि initializeApp केवल एक बार ही कॉल हो।
//    यदि कोई ऐप पहले से ही इनिशियलाइज़्ड है (जो getApps() से मिलता है), तो उसे ही उपयोग करें।
//    अन्यथा, नया ऐप इनिशियलाइज़ करें।
const firebaseApps = getApps(); // सक्रिय Firebase ऐप्स की लिस्ट प्राप्त करें
let app;

if (!firebaseApps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // यह बिल्कुल सही है!
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("❌ ERROR: Missing Firebase environment variables (FIREBASE_PROJECT_ID, PRIVATE_KEY, or CLIENT_EMAIL).");
    process.exit(1); // यदि वेरिएबल्स मिसिंग हैं तो बाहर निकलें
  }

  app = initializeApp({
    credential: cert(serviceAccount as any),
  });
  console.log('✅ Firebase Admin SDK initialized successfully.');
} else {
  // यदि ऐप पहले से इनिशियलाइज़्ड है, तो पहला ऐप इस्तेमाल करें
  app = firebaseApps[0];
  console.log('✅ Firebase Admin SDK already initialized.');
}

// ✅ authAdmin को एक्सपोर्ट करें, जो अब इस 'app' इंस्टेंस से आएगा
export const authAdmin = getAuth(app);
