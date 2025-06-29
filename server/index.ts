// server/index.ts
const express = require("express");
const cors = require("cors");
const { registerRoutes } = require("./routes");
const { setupVite, serveStatic, log } = require("./vite");
const { createServer } = require("http");
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");
const path = require("path");
const { fileURLToPath } = require("url");
const admin = require("firebase-admin");

const __filename = fileURLToPath(__filename); // fileURLToPath expects import.meta.url, so skip this
const __dirname = __dirname; // Fallback in CJS

const app = express();
let server;

// ✅ Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Drizzle Migrations
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
  } catch (error) {
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

// ✅ Main server start
(async () => {
  const isDev = app.get("env") === "development";

  // ✅ Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  console.log("✅ Firebase Admin SDK initialized.");

  if (isDev) {
    await runMigrations();
  }

  console.log("✅ Migrations done. Starting server...");

  if (!isDev) {
    await registerRoutes(app);
    log("🌐 Production mode: Serving static files...");
    serveStatic(app);

    // ✅ Fallback route for frontend (SPA)
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  // 🔻 Error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = process.env.PORT || 5000;

  server = createServer(app);

  if (isDev) {
    log("⚙️ Development mode (Vite HMR)...");
    await setupVite(app, server);
  }

  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`🚀 Server listening on port ${port} in ${app.get("env")} mode`)
  );
})();

// ✅ API Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured;

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
