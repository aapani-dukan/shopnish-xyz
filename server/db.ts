// server/db.ts  ✅ HTTP/TCP आधारित नया कोड
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/backend/schema';

// ─── Pool via TCP/HTTP ──────────────────────────
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // Render & many SaaS PG need this
});

// drizzle instance
export const db = drizzle(pool, { schema });
