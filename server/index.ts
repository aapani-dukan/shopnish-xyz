// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } = require("url"); // ✅ CommonJS के लिए require का उपयोग करें
// ✅ Firebase Admin SDK को डिफ़ॉल्ट एक्सपोर्ट के रूप में इम्पोर्ट करें
import * as admin from 'firebase-admin'; 

const app = express();
let server: Server;

// ✅ CommonJS के लिए __filename और __dirname को डिफाइन करें
const __filename = typeof require!== 'undefined'? require('url').fileURLToPath(import.meta.url) : '';
const __dirname = typeof require!== 'undefined'? require('path').dirname(__filename) : '';


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Drizzle Migrations ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is not set.");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
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
  const isDev = app.get("env") === "development";

  // ✅ Firebase Admin SDK को इनिशियलाइज़ करें
  // 'admin.apps' का उपयोग करें
  if (!admin.apps.length) { 
    admin.initializeApp({
      credential: admin.credential.applicationDefault() 
    });
  }
  console.log("✅ Firebase Admin SDK initialized.");

  if (isDev) {
    await runMigrations();
  }

  console.log("✅ Migrations done. Starting server...");

  if (!isDev) {
    await registerRoutes(app); // ✅ registerRoutes को admin ऑब्जेक्ट पास करने की अब आवश्यकता नहीं है
    log("🌐 Production mode: Serving static files...");
    serveStatic(app);

    // ✅ IMPORTANT: Fallback for SPA frontend routing (Wouter)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // 🔻 Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status |
| err.statusCode |
| 500;
    const message = err.message |
| "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = process.env.PORT |
| 5000;

  if (isDev) {
    log("⚙️ Development mode (Vite HMR)...");
    server = createServer(app);
    await setupVite(app, server);
  } else {
    server = createServer(app);
  }

  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`🚀 Server listening on port ${port} in ${app.get("env")} mode`)
  );
})();

// --- Request Logging for /api routes ---
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured: unknown;

  const orig = res.json.bind(res);
  res.json = (body,...rest) => ((captured = body), orig(body,...rest));

  res.on("finish", () => {
    if (!p.startsWith("/api")) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    log(line.length > 90? line.slice(0, 89) + "…" : line);
  });

  next();
});
