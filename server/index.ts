import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";
import * as admin from 'firebase-admin'; // Firebase Admin SDK इम्पोर्ट करें

// Drizzle माइग्रेशन के लिए इम्पोर्ट
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path'; // 'path' मॉड्यूल इम्पोर्ट करें

const app = express();
let server: Server;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Firebase Admin SDK Initialization START ---
try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Firebase Admin SDK will not be initialized.");
  } else {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    log("Firebase Admin SDK initialized successfully.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY format:", error);
}
// --- Firebase Admin SDK Initialization END ---

// --- Drizzle Migrations START ---
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set. Drizzle migrations cannot run.");
    return; // माइग्रेशन के बिना आगे बढ़ें या सर्वर बंद करें
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false // Render PostgreSQL के लिए अक्सर आवश्यक होता है
    }
  });

  const db = drizzle(pool);

  try {
    console.log("Starting Drizzle migrations...");
    // अब 'server/migration' पाथ का उपयोग कर रहे हैं।
    // __dirname 'server' फ़ोल्डर को संदर्भित करता है, इसलिए 'migration' सीधे अंदर है।
    await migrate(db, { migrationsFolder: path.resolve(__dirname, './migration') }); 
    console.log("Drizzle Migrations complete!");
  } catch (error) {
    console.error("Drizzle Migrations failed:", error);
    // आप यहां सर्वर को बंद करने पर विचार कर सकते हैं यदि डेटाबेस माइग्रेशन महत्वपूर्ण है
    // process.exit(1);
  } finally {
    await pool.end(); // पूल को बंद करना महत्वपूर्ण है
  }
}

// सर्वर शुरू होने से पहले माइग्रेशन चलाएं
(async () => {
  await runMigrations(); // <-- माइग्रेशन को चलाएं
  // Rest of your server startup logic
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
// --- Drizzle Migrations END ---


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

// The main server startup logic is now inside the async IIFE after runMigrations()
