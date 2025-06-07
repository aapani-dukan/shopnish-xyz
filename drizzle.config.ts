import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './server/shared/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',      // <-- ये देना जरूरी है
  driver: 'durable-sqlite',   // <-- यह example के लिए, आप PostgreSQL के लिए कुछ नहीं देना चाहते तो इसे हटा दें या सही ड्राइवर डालें
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
