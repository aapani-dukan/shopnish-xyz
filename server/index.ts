// server/index.ts

import express, { type Request, type Response, type NextFunction, type Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.ts";
import "./lib/firebaseAdmin.ts";
import { createServer, type Server } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
let server: Server;

// --------------------- Middlewares ---------------------
app.use(
  cors({
    origin: "https://shopnish-9vlk.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --------------------- Drizzle Migration ---------------------
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set.");
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

// --------------------- Start Server ---------------------
(async () => {
  const isProd = process.env.NODE_ENV === "production";

  await runMigrations();
  console.log("✅ Migrations done. Starting server...");

  // Request Logging Middleware (for API)
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
      console.log(line.length > 90 ? line.slice(0, 89) + "…" : line);
    });

    next();
  });

  // Register All Routes
  registerRoutes(app);

  // Serve static + SPA
  if (isProd) {
    const staticPath = path.resolve(__dirname, "..", "dist", "public");
    app.use(express.static(staticPath));

    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(staticPath, "index.html"));
      } else {
        res.status(404).json({ error: "API route not found" });
      }
    });
  } else {
    // Dev mode SPA redirect
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        const target = `http://0.0.0.0:5173${req.path}`;
        res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0; url=${target}">
  </head>
  <body>
    <script>window.location.href = '${target}'</script>
  </body>
</html>`);
      } else {
        res.status(404).json({ error: "API route not found" });
      }
    });
  }

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ Server Error:", err);
    res.status(status).json({ message });

    if (process.env.NODE_ENV !== "production") throw err;
  });

  const port = process.env.PORT || 5001;
  server = createServer(app);
  server.listen({ port, host: "0.0.0.0" }, () =>
    console.log(`🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`)
  );
})();
