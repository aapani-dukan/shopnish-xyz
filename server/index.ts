// server/index.ts

import express, { type Request, type Response, type NextFunction, type Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.ts";
import './lib/firebaseAdmin.ts'; // Firebase Admin SDK init
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

app.use(cors({
  origin: 'https://shopnish-9vlk.onrender.com', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // जिन HTTP मेथड्स की आप अनुमति देते हैं
  credentials: true, // यह बहुत महत्वपूर्ण है जब आप ऑथराइजेशन हेडर भेजते हैं
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- Drizzle Migrations ---
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

  // Register all API routes - इसे यहाँ पहले रखें
  registerRoutes(app);

  // Serve static client files (जैसे index.html) - इसे API राउट्स के बाद रखें
  // यह केवल उन रिक्वेस्ट्स को पकड़ेगा जो किसी भी API रूट से मैच नहीं खाते
  if (isProd) {
    // अगर आप क्लाइंट-साइड बिल्ड को /dist/public में रख रहे हैं
    // तो यहाँ से स्टैटिक फाइलों को सर्व करें
    app.use(express.static(path.resolve(__dirname, "..", "dist", "public"))); // ✅ ADD THIS LINE

    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "..", "dist", "public", "index.html"));
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
  server.listen({ port, host: "0.0.0.0" }, () =>
    console.log(`🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`)
  );
})();

// --- Request Logging Middleware ---
// सुनिश्चित करें कि यह भी API राउट्स के बाद और स्टैटिक फाइल सर्विंग से पहले हो
// मैंने इसे आपके कोड में नीचे रखा था, इसे यहां से हटाकर राउट्स के ऊपर ला रहा हूँ
// ताकि यह सभी रिक्वेस्ट्स को लॉग कर सके।
// लेकिन अगर आप केवल API रिक्वेस्ट्स को लॉग करना चाहते हैं (जैसा कि आपके कोड में था)
// तो इसे रजिस्टरRoutes के बाद ही रहने दें, लेकिन app.get("*") से पहले।
// आपके मौजूदा कोड के हिसाब से, इसे वहीं रहने दें जहाँ यह है,
// बशर्ते यह API राउट्स के बाद ही आए।
// इसका क्रम आपकी मुख्य समस्या नहीं है, इसलिए मैं इसे छेड़ नहीं रहा।
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
    if (!p.startsWith("/api")) return; // यह लॉगिंग केवल /api राउट्स के लिए है
    const ms = Date.now() - start;
    let line = `${req.method} ${p} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    console.log(line.length > 90 ? line.slice(0, 89) + "…" : line);
  });

  next();
});
