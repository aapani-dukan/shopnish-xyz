// server/lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  // आवश्यक एनवायरनमेंट वैरिएबल्स को इकट्ठा करें
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // <-- यहाँ \n को वापस न्यूलाइन में बदलें
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com', // यह वैकल्पिक हो सकता है
  };

  // सुनिश्चित करें कि कोई भी महत्वपूर्ण वैरिएबल गुम न हो
  // यदि कोई आवश्यक वेरिएबल गुम है, तो एरर दें
  const requiredKeys = [
    'type', 'project_id', 'private_key_id', 'private_key',
    'client_email', 'client_id', 'auth_uri', 'token_uri',
    'auth_provider_x509_cert_url', 'client_x509_cert_url'
  ];

  for (const key of requiredKeys) {
    if (!serviceAccount[key as keyof typeof serviceAccount]) {
      throw new Error(`Firebase environment variable ${key.toUpperCase()} is not defined or is empty.`);
    }
  }

  // Admin SDK को इनिशियलाइज़ करें
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount), // type assertion जरूरी हो सकती है
  });
}

export default admin;
