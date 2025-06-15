const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './shared/backend/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL, // ✅ Safe
  },
});
