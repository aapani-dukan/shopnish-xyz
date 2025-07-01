// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import registerRoutes from "./routes.js";
import { setupVite, log } from "./vite.js"; // setupVite और log को इम्पोर्ट किया

import { createServer, type Server } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import * as admin from "firebase-admin"; // इसे Firebase Admin SDK इनिशियलाइज़ेशन के लिए इम्पोर्ट करें

// ✅ ESM-compatible __filename & __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let server: Server;

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
  // app.get('env') केवल Express 4.x में डिफ़ॉल्ट रूप से काम करता है
  // प्रोडक्शन मोड को process.env.NODE_ENV से निर्धारित करना अधिक विश्वसनीय है
  const isProd = process.env.NODE_ENV === 'production';

  // Firebase Admin SDK को इनिशियलाइज़ करें (यह केवल एक बार होना चाहिए)
  // सुनिश्चित करें कि यह आपके `server/lib/firebaseAdmin.ts` में है और उसे यहीं इम्पोर्ट किया गया है।
  // उदाहरण के लिए: import './lib/firebaseAdmin';
  // यदि यह firebaseAdmin.ts में है, तो आपको इसे यहां अलग से करने की आवश्यकता नहीं है।
  // यदि आप इसे यहां सीधे कर रहे हैं, तो सुनिश्चित करें कि क्रेडेंशियल सही हैं।
  // पुराने कमेंट्स को हटा दिया है जो Firebase Admin को यहां डुप्लीकेट करते थे।

  if (isProd) {
    // प्रोडक्शन मोड में माइग्रेशन चलाएं
    await runMigrations();
  } else {
    // डेवलपमेंट मोड में माइग्रेशन चलाएं
    await runMigrations();
  }
  console.log("✅ Migrations done. Starting server...");

  // Vite सेटअप को कॉल करें। यह production में sirv मिडलवेयर को जोड़ देगा
  // और development में Vite middleware को।
  await setupVite(app); // <--- यह महत्वपूर्ण है! इसे वापस जोड़ा गया है।

  // API रूट्स रजिस्टर करें
  // इन्हें स्टैटिक फाइलें सर्व करने के बाद ही हैंडल किया जाना चाहिए ताकि
  // /api रूट्स स्टैटिक फाइलों के साथ कॉन्फ़्लिक्ट न करें।
  registerRoutes(app);

  if (isProd) {
    // ✅ SPA के लिए कैच-ऑल फॉलबैक
    // यह सभी अन्य रूट्स के बाद आना चाहिए, जिसमें static file serving भी शामिल है।
    app.get("*", (req, res) => {
      // sirv पहले ही /client/dist को हैंडल कर रहा होगा
      // यदि रिक्वेस्ट किसी भी स्टैटिक फाइल से मैच नहीं करती है, तो index.html सर्व करें
      res.sendFile(path.resolve(__dirname, '..', 'dist', 'public', 'index.html'));
    });
  }

  // 🔻 Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("❌ Server Error:", err); // Error को लॉग करें
    res.status(status).json({ message });
    // Production में 'throw err' न करें क्योंकि यह प्रोसेस को क्रैश कर देगा।
    // development में डिबगिंग के लिए यह ठीक है, लेकिन production में इससे बचें।
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });

  const port = process.env.PORT || 5000;

  // Development/Production के आधार पर सर्वर को लिसन करें
  // setupVite में ही Vite server को setup किया जाता है,
  // तो यहां केवल Node.js HTTP server को क्रिएट और लिसन करें।
  server = createServer(app);

  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`🚀 Server listening on port ${port} in ${isProd ? 'production' : 'development'} mode`)
  );
})();

// --- Request Logging for /api routes ---
// यह मिडलवेयर, अन्य मिडलवेयर और रूट्स के बाद आना चाहिए।
// इसे (async () => { ... })(); ब्लॉक के बाहर रखने से यह सभी रिक्वेस्ट पर लागू होगा।
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
    log(line.length > 90 ? line.slice(0, 89) + "…" : line);
  });

  next();
});
