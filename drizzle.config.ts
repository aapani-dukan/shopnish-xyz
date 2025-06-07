import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './server/shared/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',    // postgres के लिए यह सेट करें
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
