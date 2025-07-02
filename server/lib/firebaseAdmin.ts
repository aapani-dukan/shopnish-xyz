// server/lib/firebaseAdmin.ts

// ✅ CommonJS मॉड्यूल को ESM में इम्पोर्ट करने का सबसे सुरक्षित तरीका
import firebaseAdmin from 'firebase-admin'; // 'pkg' के बजाय 'firebaseAdmin' नाम दिया

// अब firebaseAdmin ऑब्जेक्ट से सभी आवश्यक फ़ंक्शंस और ऑब्जेक्ट्स को डिस्ट्रक्चर करें
const { initializeApp, credential, apps, auth: firebaseAuth } = firebaseAdmin;

if (!apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.client_email) { // यहां client_email को clientEmail होना चाहिए, पिछली बार ठीक किया था, फिर से चेक करें
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

// ✅ authAdmin को एक्सपोर्ट करें
const initializedApp = apps.length ? apps[0] : initializeApp({}); // यह सुनिश्चित करें कि यह हमेशा एक इनिशियलाइज़्ड ऐप इंस्टेंस प्राप्त करता है
export const authAdmin = firebaseAuth(initializedApp);
