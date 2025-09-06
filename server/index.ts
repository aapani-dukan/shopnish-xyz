// server/index.ts
import express, { type Request, type Response, type NextFunction, type Express } from "express";
import cors from "cors";
import apiRouter from "./routes";
import "./lib/firebaseAdmin.ts";
import { createServer, type Server } from "http";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// ✅ Import the single database instance
import { db, databasePool } from "./db.ts";

import { initSocket } from "./socket.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
let server: Server;

const isProd = process.env.NODE_ENV === "production";
const clientURL = isProd
  ? process.env.CLIENT_URL || "https://shopnish-lzrf.onrender.com"
  : "http://localhost:5173";

app.use(
  cors({
    origin: clientURL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- Drizzle Migrations ---
async function runMigrations() {
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
  } 
  // ❌ Removed the 'finally' block that closed the pool.
  // The pool should stay open for the server's lifetime.
}

// --- Start Server ---
(async () => {
  await runMigrations();
  console.log("✅ Migrations done. Starting server...");

  // --- Request Logging Middleware ---
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

  // Register all routes
  app.use("/api", apiRouter);

  // Serve static files (production only)
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, "..", "dist", "public")));

    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "..", "dist", "public", "index.html"));
    });
  } else {
    // Dev mode redirect
    app.get("", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Redirecting...</title>
              <meta http-equiv="refresh" content="0; url=http://0.0.0.0:5173${req.path}">
            </head>
            <body>
              <script>window.location.href = 'http://0.0.0.0:5173${req.path}'</script>
            </body>
          </html>
        `);
      } else {
        res.status(404).json({ error: "API route not found" });
      }
    });
  }

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ Server Error:", err);
    res.status(status).json({ message });

    // ❌ This line has been removed to prevent server crashes in production
    // if (process.env.NODE_ENV !== "production") throw err;
  });

  const port = process.env.PORT || 5001;
  server = createServer(app);

  initSocket(server);

  server.listen({ port, host: "0.0.0.0" }, () =>
    console.log(
      `🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`
    )
  );
})();
