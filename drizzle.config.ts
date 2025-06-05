
import * as dotenv from "dotenv";      
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql", // ✅ ज़रूरी
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
