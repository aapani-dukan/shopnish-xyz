import { Pool } from "pg";                 // ✅ साधारण pg Pool
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/backend/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set (Render → Environment Vars)");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },      // Render पर SSL ऑन रहता है
});

export const db = drizzle(pool, { schema });
