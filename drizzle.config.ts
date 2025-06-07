import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './server/shared/schema.ts', // ✅ आपका schema path
  out: './server/migrations',
  driver: 'pg',
  dialect: 'postgresql',               // ✅ REQUIRED: यह line ज़रूर चाहिए
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
