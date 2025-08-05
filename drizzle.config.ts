// drizzle.config.ts
import { defineConfig, type Config } from "drizzle-kit"; // ✅ Config टाइप को इम्पोर्ट करें
import * as dotenv from 'dotenv'; // .env फ़ाइल से DATABASE_URL लोड करने के लिए इसे जोड़ें

// .env फ़ाइल को लोड करें (सुनिश्चित करें कि आपके प्रोजेक्ट के रूट में .env फ़ाइल है)
dotenv.config({ path: '.env' });

// DATABASE_URL मौजूद न हो तो तुरंत साफ़ Error दें
if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing DATABASE_URL. Please set it in your environment and provision the database.',
  );
}

export default defineConfig({ // ✅ defineConfig का उपयोग करें
  // माइग्रेशन फ़ाइलों की आउटपुट लोकेशन
  out: "./drizzle/migrations", // यह पाथ सही है

  // आपकी स्कीमा फ़ाइल
  schema: "./shared/backend/schema.ts", // यह पाथ सही है

  // DB डायलेक्ट और ड्राइवर
  // 'dialect' और 'driver' दोनों का उपयोग करें
  dialect: "postgresql", // Drizzle ORM के लिए डायलेक्ट
  driver: "node-postgres", // Drizzle Kit के लिए विशिष्ट ड्राइवर (जैसे 'pg' npm पैकेज)

  // कनेक्शन क्रेडेन्शियल्स
  dbCredentials: {
    connectionString: process.env.DATABASE_URL, // ✅ 'url' की जगह 'connectionString' का उपयोग करें
    ssl: { rejectUnauthorized: false } // Render जैसे प्रोवाइडर्स के लिए यह महत्वपूर्ण है
  },
}) satisfies Config; // ✅ 'satisfies Config' जोड़ें ताकि TypeScript सही कॉन्फ़िग की पुष्टि करे
