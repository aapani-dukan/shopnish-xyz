import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/backend/schema";
import "dotenv/config";

/* ✅ DATABASE_URL check */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

/* ✅ Pool with SSL */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // 🔒 Important for Render with self-signed cert
  },
});

/* ✅ Drizzle ORM init */
export const db = drizzle(pool, { schema });
