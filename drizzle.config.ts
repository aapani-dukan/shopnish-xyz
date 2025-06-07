import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './server/shared/schema.ts',
  out: './server/migrations',
  driver: 'pg', // ✅ अब यह ही काफी है
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
