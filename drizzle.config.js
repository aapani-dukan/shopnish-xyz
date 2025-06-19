// drizzle.config.js
import { defineConfig } from "drizzle-kit";

// यह Drizzle Kit कॉन्फ़िग फ़ाइल है।
// DATABASE_URL एनवायरनमेंट वेरिएबल का चेक आपके सर्वर के एंट्री पॉइंट (जैसे server.ts) में होना चाहिए, यहाँ नहीं।

export default defineConfig({
  // माइग्रेशन फ़ाइलों के लिए आउटपुट डायरेक्टरी
  out: "./drizzle/migrations", // आमतौर पर './drizzle' या './migrations' होता है।
                               // सुनिश्चित करें कि यह डायरेक्टरी आपके प्रोजेक्ट में मौजूद है।

  // आपकी स्कीमा फ़ाइल का पाथ
  schema: "./shared/backend/schema.ts", // ✅ 'backend' को 'backsnd' से ठीक किया गया

  // आप किस प्रकार के डेटाबेस का उपयोग कर रहे हैं (PostgreSQL के लिए 'postgresql')
  dialect: "postgresql",

  // डेटाबेस क्रेडेंशियल
  dbCredentials: {
    url: process.env.DATABASE_URL, // Render पर सेट DATABASE_URL का उपयोग करेगा
  },
});
