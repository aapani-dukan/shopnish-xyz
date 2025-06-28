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
import { fileURLToPath } from "url";
// ✅ Firebase Admin SDK के लिए कोई सीधा इम्पोर्ट यहाँ नहीं

const app = express();
let server: Server;
let firebaseAdmin: any; // ✅ Firebase Admin SDK ऑब्जेक्ट को स्टोर करने के लिए वेरिएबल

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Drizzle Migrations ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  console.log("Executing runMigrations function...");
  console.log("Checking DATABASE_URL...");
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
    console.log("🚀 Starting Drizzle migrations...");
    const migrationsPath = path.resolve(__dirname, "migrations");
    console.log(`📁 Running migrations from: ${migrationsPath}`);

    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("✅ Drizzle migrations completed successfully.");
  } catch (error: any) {
    if (error?.code === "42P07") {
      console.warn("⚠️ Table already exists. Skipping migration.");
    } else {
      console.error("❌ Drizzle Migrations failed:", error);
    }
  } finally {
    console.log("🔁 Closing database pool...");
    try {
      await pool.end();
      console.log("✅ Database pool closed.");
    } catch (poolError) {
      console.error("❌ Failed to close database pool:", poolError);
    }
  }
}

// --- Start Server ---
(async () => {
  const isDev = app.get("env") === "development";

  // ✅ Firebase Admin SDK को डायनामिकली इम्पोर्ट और इनिशियलाइज़ करें
  try {
    console.log("Attempting to import firebase-admin dynamically...");
    const adminModule = await import('firebase-admin');
    firebaseAdmin = adminModule.default || adminModule; // CommonJS इंटरॉप के लिए
    
    // यह चेक करें कि SDK पहले से इनिशियलाइज़ है या नहीं
    if (!firebaseAdmin.apps.length) { 
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.applicationDefault() 
      });
      console.log("✅ Firebase Admin SDK initialized dynamically.");
    } else {
        console.log("✅ Firebase Admin SDK already initialized.");
    }
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin SDK:", error);
    // यदि Firebase Admin SDK इनिशियलाइज़ नहीं हो पाता है, तो ऐप को बंद करना उचित है
    process.exit(1); 
  }

  if (isDev) {
    await runMigrations();
  }

  console.log("✅ Migrations done. Starting server setup...");

  if (!isDev) {
    // ✅ registerRoutes को firebaseAdmin ऑब्जेक्ट पास करें
    await registerRoutes(app, firebaseAdmin); 
    log("🌐 Production mode: Serving static files...");
    serveStatic(app);

    // ✅ IMPORTANT: Fallback for SPA frontend routing (Wouter)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // 🔻 Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = process.env.PORT || 5000;

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
  res.json = (body, ...rest) => ((captured = body), orig(body, ...rest));

  res.on("finish", () => {
    if (!p.startsWith("/api")) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    log(line.length > 90 ? line.slice(0, 89) + "…" : line);
  });

  next();
});
