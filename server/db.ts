import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/backend/schema";
import "dotenv/config";

/* ── Pool बनायें ───────────────────────────────── */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,   // ⬅️  यही लाइन error रोकती है
  },
});

export const db = drizzle(pool, { schema });
