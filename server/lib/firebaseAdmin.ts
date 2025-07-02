// server/lib/firebaseAdmin.ts

// ✅ 'firebase-admin' पैकेज से सीधे initializeApp, credential, और apps को इम्पोर्ट करें
import { initializeApp, credential, apps } from "firebase-admin";
// यदि आपको Admin SDK के अन्य हिस्सों की आवश्यकता है, तो उन्हें भी यहीं से इम्पोर्ट करें
import { getAuth } from 'firebase-admin/auth'; // उदाहरण के लिए, यदि आप auth() को सीधे उपयोग करना चाहते हैं
// ध्यान दें: अब 'admin' ऑब्जेक्ट का उपयोग नहीं होगा, क्योंकि हमने हिस्सों को सीधे इम्पोर्ट कर लिया है।

if (!apps.length) { // 'apps' का सीधे उपयोग करें
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("❌ ERROR: Missing Firebase environment variables (FIREBASE_PROJECT_ID, PRIVATE_KEY, or CLIENT_EMAIL).");
    process.exit(1);
  }

  initializeApp({ // 'initializeApp' का सीधे उपयोग करें
    credential: credential.cert(serviceAccount as any), // 'credential.cert' का सीधे उपयोग करें। TypeScript शिकायत करे तो 'as any' जोड़ें।
  });
  console.log('✅ Firebase Admin SDK initialized successfully.');
} else {
  console.log('✅ Firebase Admin SDK already initialized.');
}

// अब हमें 'authAdmin' को एक्सपोर्ट करना होगा, जिसे हम routes.ts में उपयोग करेंगे
// ध्यान दें: यह Firebase ऐप इनिशियलाइज़ होने के बाद ही उपलब्ध होगा
const initializedApp = apps.length ? apps[0] : initializeApp({ /*...re-init if needed, though 'apps.length' check handles it...*/ });
export const authAdmin = getAuth(initializedApp); // इनिशियलाइज़्ड ऐप से auth सर्विस प्राप्त करें
