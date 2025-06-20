// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";
import admin from "firebase-admin"; // ✅ केवल यही रखना है
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
let server: Server;

// ESM में __dirname और __filename को डिफाइन करें
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Firebase Admin SDK Initialization START ---
try {
  const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJsonString) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
  } else {
    const serviceAccount = JSON.parse(serviceAccountJsonString);

    if (admin.credential && typeof admin.credential.cert === 'function') {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized successfully.");
    } else {
      console.error("❌ admin.credential.cert is undefined. Make sure firebase-admin is imported correctly.");
    }
  }
} catch (err) {
  console.error("❌ Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY content or parsing:", err);
}
// --- Firebase Admin SDK Initialization END ---

// --- Firebase Admin SDK Initialization END ---

// --- Drizzle Migrations START ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  console.log("Executing runMigrations function..."); // जोड़ा गया लॉग
  console.log("Checking DATABASE_URL...");
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set. Drizzle migrations cannot run.");
    return;
  }
  console.log("DATABASE_URL is set.");

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const db = drizzle(pool);

  try {
    console.log("Starting Drizzle migrations...");
    // सुनिश्चित करें कि यह 'migrations' है जैसा कि आपके 'server' फ़ोल्डर में है
    const migrationsPath = path.resolve(__dirname, 'migrations'); 
    console.log(`Attempting to run migrations from: ${migrationsPath}`);

    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("Drizzle Migrations complete!");
  } catch (error) {
    console.error("Drizzle Migrations failed:", error);
  } finally {
    console.log("Attempting to end database pool...");
    try {
      await pool.end();
      console.log("Database pool ended successfully.");
    } catch (poolError) {
      console.error("Failed to end database pool:", poolError);
    }
  }
}

// सर्वर शुरू होने से पहले माइग्रेशन चलाएं
(async () => {
  await runMigrations(); // Migrations function is now called directly here
  console.log("Migrations function finished. Proceeding with server setup..."); // जोड़ा गया लॉग

  const isDev = app.get("env") === "development";

  if (!isDev) {
    await registerRoutes(app);
    log("Running in production mode, serving static files…");
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = process.env.PORT || 5000;

  if (isDev) {
    log("Running in development mode (Vite HMR)…");
    server = createServer(app);
    await setupVite(app, server);
  } else {
    server = createServer(app);
  }

  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`Serving on port ${port} in ${app.get("env")} mode`)
  );
})();

app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let captured: unknown;

  const orig = res.json.bind(res);
  res.json = (body, ...rest) => (captured = body, orig(body, ...rest));

  res.on("finish", () => {
    if (!p.startsWith("/api")) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    log(line.length > 90 ? line.slice(0, 89) + "…" : line);
  });
  next();
});
