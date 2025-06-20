import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";
import * as admin from 'firebase-admin'; // Firebase Admin SDK इम्पोर्ट करें

const app = express();
let server: Server;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Firebase Admin SDK Initialization START ---
// यह ब्लॉक सर्वर के शुरू होने पर Firebase Admin SDK को इनिशियलाइज़ करेगा।
// यह आपके FIREBASE_SERVICE_ACCOUNT_KEY एनवायरनमेंट वेरिएबल का उपयोग करेगा।
try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    // यदि एनवायरनमेंट वेरिएबल सेट नहीं है, तो एक एरर लॉग करें।
    // आप चाहें तो यहां सर्वर को बंद भी कर सकते हैं यदि Firebase की प्रमाणीकरण क्षमता आवश्यक है।
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Firebase Admin SDK will not be initialized.");
    // process.exit(1); // यदि आप सर्वर को बंद करना चाहते हैं, तो इस लाइन को अनकमेंट करें
  } else {
    // JSON स्ट्रिंग को पार्स करें
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Firebase Admin SDK को इनिशियलाइज़ करें
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // यदि आप Firebase के Realtime Database या Cloud Storage का उपयोग कर रहे हैं,
      // तो आपको यहां databaseURL या storageBucket जैसी अन्य सेटिंग्स जोड़नी पड़ सकती हैं।
      // उदाहरण: databaseURL: "https://your-project-id.firebaseio.com",
    });
    log("Firebase Admin SDK initialized successfully.");
  }
} catch (error) {
  // यदि JSON पार्सिंग में कोई समस्या है (गलत फ़ॉर्मेट), तो एरर पकड़ें
  console.error("Failed to initialize Firebase Admin SDK. Check FIREBASE_SERVICE_ACCOUNT_KEY format:", error);
  // process.exit(1); // यदि आप सर्वर को बंद करना चाहते हैं, तो इस लाइन को अनकमेंट करें
}
// --- Firebase Admin SDK Initialization END ---


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

(async () => {
  const isDev = app.get("env") === "development";

  if (!isDev) {
    await registerRoutes(app); // ✅ API routes को पहले रजिस्टर करें
    log("Running in production mode, serving static files…");
    serveStatic(app);          // ✅ फिर स्टैटिक फाइल्स सर्व करें
  }

  /* global error handler */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    // यदि आप एरर को लॉग करना चाहते हैं और आगे नहीं बढ़ाना चाहते हैं,
    // तो 'throw err;' को हटा सकते हैं।
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
