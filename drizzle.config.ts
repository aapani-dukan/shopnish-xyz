const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './shared/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: 'postgresql://neondb_owner:npg_98LZoDWjpxkK@ep-falling-mud-a8ib7jxz-pooler.eastus2.azure.neon.tech/neondb?sslmode=require',
  },
});
