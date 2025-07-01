// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import registerRoutes from "./routes.js";
import { setupVite, log } from "./vite.js";
import { admin } from "./lib/firebaseAdmin.js"; // ✅ Firebase Admin properly imported
import { createServer, type Server } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
    ssl: { rejectUnauthorized: false },
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

  await runMigrations();
  console.log("✅ Migrations done. Starting server...");

  await setupVite(app);

  registerRoutes(app);

  if (isProd) {
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "..", "dist", "public", "index.html"));
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ Server Error:", err);
    res.status(status).json({ message });

    if (process.env.NODE_ENV !== "production") throw err;
  });

  const port = process.env.PORT || 5000;

  server = createServer(app);
  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`)
  );
})();

// --- Request Logging Middleware for /api routes ---
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured: unknown;

  const orig = res.json.bind(res);
  res.json = (body, ...rest) => {
    captured = body;
    return orig(body, ...rest);
  };

  res.on("finish", () => {
    if (!p.startsWith("/api")) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    log(line.length > 90 ? line.slice(0, 89) + "…" : line);
  });

  next();
});
