import { defineConfig, type Config } from "drizzle-kit";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing DATABASE_URL. Please set it in your environment and provision the database.',
  );
}

export default defineConfig({
  out: "./drizzle/migrations",
  // ✅ यहाँ केवल टेबल और संबंधों की फ़ाइलें हैं।
  schema: [
    "./shared/backend/tables.ts",
    "./shared/backend/relations.ts",
  ],

  dialect: "postgresql",
  driver: "node-postgres",

  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  },
}) satisfies Config;
