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
import { fileURLToPath } from 'url';
import fs from 'fs'; // 'fs' मॉड्यूल इम्पोर्ट करें
import os from 'os'; // 'os' मॉड्यूल इम्पोर्ट करें

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
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

  if (!serviceAccountBase64) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 environment variable is not set. Firebase Admin SDK will not be initialized.");
  } else {
    try {
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');

      // एक टेम्पररी फ़ाइल बनाएँ
      const tempFilePath = path.join(os.tmpdir(), `firebase-service-account-${Date.now()}.json`);
      fs.writeFileSync(tempFilePath, serviceAccountJson); // JSON स्ट्रिंग को फ़ाइल में लिखें

      admin.initializeApp({
        credential: admin.credential.cert(tempFilePath), // फ़ाइल पाथ से क्रेडेंशियल पढ़ें
      });
      log("Firebase Admin SDK initialized successfully.");

      // ऐप बंद होने पर टेम्पररी फ़ाइल को हटा दें (वैकल्पिक, लेकिन अच्छा अभ्यास)
      process.on('exit', () => {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          log(`Temporary Firebase service account file deleted: ${tempFilePath}`);
        }
      });

    } catch (firebaseInitError) {
      console.error("Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 format or file handling:", firebaseInitError);
    }
  }
} catch (error) {
  console.error("An unexpected error occurred during Firebase Admin SDK initialization process:", error);
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
    const migrationsPath = path.resolve(__dirname, 'migrations'); // सुनिश्चित करें कि 'migration' नाम छोटा 'm' से है
    console.log(`Attempting to run migrations from: ${migrationsPath}`);

    await migrate(db, { migrationsFolder: migrationsPath });
    console.log("Drizzle Migrations complete!");
  } catch (error) {
    console.error("Drizzle Migrations failed:", error);
    // यहां एरर को फिर से फेंकने या प्रोसेस को बंद करने पर विचार करें,
    // यदि डेटाबेस माइग्रेशन महत्वपूर्ण है, तो यह ऐप को बिना स्कीमा के चलने से रोकेगा।
    // मौजूदा एरर "relation already exists" एक अच्छा संकेत है कि टेबल बनी हुई हैं।
    // throw error;
    // process.exit(1); // यदि माइग्रेशन विफल हो तो ऐप को क्रैश करें
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
  await runMigrations();
  console.log("Migrations function finished. Proceeding with server setup...");

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
