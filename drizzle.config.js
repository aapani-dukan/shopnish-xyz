const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './shared/backend/schema.ts',          // ← अपना schema path
  out: './server/migrations',            // ← migrations यहीं बनेंगी
  dialect: 'postgresql',                 // ← enum-value ठीक
  dbCredentials: {
    postgresql://shopnishu_user:LDaO1MrBi45i7kVzcrU2VekEkNkeJUKH@dpg-d16qqtgdl3ps739nvv90-a.oregon-postgres.render.com/shopnish_db
    // ↑ NOTE: फ़ील्ड-नाम “url” है, “connectionString” नहीं
  },
});
