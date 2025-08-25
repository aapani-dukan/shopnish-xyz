import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/backend/schema.ts";
import "dotenv/config";

// ✅ Ensure DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL must be set in your .env file");
}

// ✅ PostgreSQL Pool with SSL support (for Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // 🔐 Trust self-signed certs (Render)
  },
});

// ✅ Initialize Drizzle ORM
export const db = drizzle(pool, { schema });
