ror("DATABASE_URL, ensure the database is provisioned");
};

if (!process.env.DATABASE_URL) {
  throw new Er

export default defineConfig({
  out: "./miimport { defineConfig } from "drizzle-kit"grations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
