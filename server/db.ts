import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/backend/schema.ts";
import "dotenv/config";
import { Client } from 'pg';
// ✅ Ensure DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL must be set in your .env file");
}
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

export const db = drizzle(client, { schema }); // यहाँ पर schema ऑब्जेक्ट को पास किया गया है
// ✅ PostgreSQL Pool with SSL support (for Render)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // 🔐 Trust self-signed certs (Render)
  },
});

// ✅ Initialize Drizzle ORM
export const db = drizzle(pool, { schema });
