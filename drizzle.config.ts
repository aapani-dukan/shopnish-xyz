import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './shared/schema.ts',       // अपने schema का path
  out: './server/migrations',         // यहां drizzle migrations बनाएगा
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
