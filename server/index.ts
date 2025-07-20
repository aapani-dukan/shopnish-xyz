// server/index.ts

import express, { type Request, type Response, type NextFunction, type Express } from "express"; // Ensure Express type is imported
import cors from "cors";
import { registerRoutes } from "./routes.ts"; // ✅ Changed to named import for registerRoutes
import { setupVite, log } from "./vite.ts";
import './lib/firebaseAdmin.ts'; // Ensure Firebase Admin SDK initialization happens here (within this imported file)
import { createServer, type Server } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express(); // Explicitly type app as Express
let server: Server;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- Drizzle Migrations ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Necessary for Render's PostgreSQL
  });

  const db = drizzle(pool);

  try {
    const migrationsPath = path.resolve(__dirname, "migrations");
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("✅ Drizzle migrations completed.");
  } catch (error: any) {
    if (error?.code === "42P07") {
      console.warn("⚠️ Table already exists. Skipping migration.");
    } else {
      console.error("❌ Migration Error:", error);
    }
  } finally {
    try {
      await pool.end();
    } catch (poolError) {
      console.error("❌ Failed to close pool:", poolError);
    }
  }
}

// --- Start Server ---
(async () => {
  const isProd = process.env.NODE_ENV === "production";

  // Run migrations before starting the server
  await runMigrations();
  console.log("✅ Migrations done. Starting server...");

  // Setup Vite development server or serve static assets in production
  await setupVite(app);

  // Register all API routes
  registerRoutes(app); // ✅ Call the named export registerRoutes

  // Serve production client-side assets for any unmatched routes
  if (isProd) {
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "..", "dist", "public", "index.html"));
    });
  }

  // Global Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ Server Error:", err);
    res.status(status).json({ message });

    // In development, re-throw the error for better debugging
    if (process.env.NODE_ENV !== "production") throw err;
  });

  const port = process.env.PORT || 5001;

  server = createServer(app);
  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`)
  );
})();

// --- Request Logging Middleware for /api routes (placed after routes are registered) ---
// This middleware should ideally be placed *before* `registerRoutes(app)`
// to capture all requests, but if you only want to log /api, keeping it here is fine.
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured: unknown;

  // Monkey-patch res.json to capture response body for logging
  const orig = res.json.bind(res);
  res.json = (body, ...rest) => {
    captured = body;
    return orig(body, ...rest);
  };

  res.on("finish", () => {
    if (!p.startsWith("/api")) return; // Only log API routes
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    log(line.length > 90 ? line.slice(0, 89) + "…" : line); // Truncate long logs
  });

  next();
});
