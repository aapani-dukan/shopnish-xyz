import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './shared/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
