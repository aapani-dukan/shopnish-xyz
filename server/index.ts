// server/index.ts
import express, { type Request, type Response, type NextFunction, type Express } from "express";
import cors from "cors";
import apiRouter from "./routes.ts";
import "./lib/firebaseAdmin.ts";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// ✅ Socket helper import
import { getIO } from "./socket.ts";
import { setIO } from " ./socket.ts";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
let server: Server;

app.use(
  cors({
    origin: ["https://shopnish-lzrf.onrender.com", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- Drizzle Migrations ---
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

// --- Start Server ---
(async () => {
  const isProd = process.env.NODE_ENV === "production";

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

    if (process.env.NODE_ENV !== "production") throw err;
  });

  const port = process.env.PORT || 5001;
  server = createServer(app);

  // ✅ Socket.IO को HTTP सर्वर से जोड़ें
  const io = new SocketIOServer(server, {
    cors: {
      origin: ["https://shopnish-lzrf.onrender.com", "http://localhost:5173"],
      methods: ["GET", "POST"],
    },
  });

  // ✅ io को globally set करें
  setIO(io);

  // ✅ Socket.IO कनेक्शन हैंडलर
  io.on("connection", (socket) => {
    console.log("⚡ New client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  server.listen({ port, host: "0.0.0.0" }, () =>
    console.log(
      `🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`
    )
  );
})();
