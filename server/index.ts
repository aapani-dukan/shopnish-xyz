// server/index.ts

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";
import * as admin from 'firebase-admin';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url'; // ESM-संगत __dirname के लिए यह नया इम्पोर्ट है

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
  // Base64 एन्कोडेड कुंजी को पर्यावरण वेरिएबल से प्राप्त करें
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  if (!serviceAccountBase64) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set. Firebase Admin SDK will not be initialized.");
  } else {
    try {
      // Base64 स्ट्रिंग को डीकोड करके JSON में पार्स करें
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      log("Firebase Admin SDK initialized successfully.");
    } catch (parseError) {
      console.error("Failed to parse Firebase Service Account JSON after Base64 decoding:", parseError);
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable or decoding process:", error);
}
// --- Firebase Admin SDK Initialization END ---

// --- Drizzle Migrations START ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

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
    // अब __dirname सही ढंग से डिफाइन है
    const migrationsPath = path.resolve(__dirname, 'migrations');
    console.log(`Attempting to run migrations from: ${migrationsPath}`);

    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("Drizzle Migrations complete!");
  } catch (error) {
    console.error("Drizzle Migrations failed:", error);
    // यदि माइग्रेशन विफल हो तो ऐप को क्रैश करने पर विचार करें, क्योंकि डेटाबेस स्कीमा के बिना ऐप काम नहीं करेगा
    // throw error;
    // process.exit(1);
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
  console.log("Executing runMigrations function...");
  await runMigrations(); // <-- माइग्रेशन को चलाएं
  console.log("Migrations function finished. Proceeding with server setup...");

  // Seed database (अगर यह आपके setup में है)
  // लॉग्स में 'Database already seeded' और 'Database seeded successfully' दिख रहे थे
  // तो यह भाग आपके codebase में कहीं और है जो 'runMigrations' के बाद चल रहा है।
  // सुनिश्चित करें कि seeding का लॉजिक भी tables बनने के बाद ही चलता है।
  // अगर seeding में भी `products` टेबल की ज़रूरत है, तो वह भी माइग्रेशन के बाद ही होनी चाहिए।
  // यहाँ पर कोई बदलाव नहीं कर रहा हूँ क्योंकि seeding लॉजिक इस फाइल में पूरा नहीं दिख रहा।

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
