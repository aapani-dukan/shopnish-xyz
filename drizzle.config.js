const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './shared/backend/schema.ts',          // ← अपना schema path
  out: './server/migrations',            // ← migrations यहीं बनेंगी
  dialect: 'postgresql',                 // ← enum-value ठीक
  dbCredentials: {
    url: 'postgresql://neondb_owner:npg_98LZoDWjpxkK@ep-falling-mud-a8ib7jxz-pooler.eastus2.azure.neon.tech/neondb?sslmode=require',
    // ↑ NOTE: फ़ील्ड-नाम “url” है, “connectionString” नहीं
  },
});
