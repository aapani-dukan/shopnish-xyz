// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

// DATABASE_URL मौजूद न हो तो तुरंत साफ़ Error दें
if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing DATABASE_URL. Please set it in your environment and provision the database.',
  );
}

export default defineConfig({
  // माइग्रेशन फ़ाइलों की आउटपुट लोकेशन
  out: "./drizzle/migrations",

  // आपकी स्कीमा फ़ाइल
  schema: "./shared/backend/schema.ts",

  // DB डायलेक्ट
  dialect: "postgresql",

  // कनेक्शन क्रेडेन्शियल्स
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
