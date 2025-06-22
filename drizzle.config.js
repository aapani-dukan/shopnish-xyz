import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./shared/backend/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // 🔑 यही key चाहिए
    url: process.env.DATABASE_URL,
  },
});
