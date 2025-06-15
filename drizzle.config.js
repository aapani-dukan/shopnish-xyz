const { defineConfig } = require('drizzle-kit');

module.exports = defineConfig({
  schema: './shared/backend/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://shopnishu_user:LDaO1MrBi45i7kVzcrU2VekEkNkeJUKH@dpg-d16qqtgdl3ps739nvv90-a/shopnish_db',
  },
});
