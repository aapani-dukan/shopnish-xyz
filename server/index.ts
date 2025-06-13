// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, log, serveStatic } from "./vite";
import { createServer, type Server } from "http"; // ✅ createServer इम्पोर्ट करें

const app = express();
let server: Server; // ✅ server variable को यहां घोषित करें

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Request Logging (यह ठीक है)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ✅ Production mode में, सबसे पहले स्टैटिक फ़ाइलें सर्व करें
  if (app.get("env") !== "development") {
    log("Running in production mode, serving static files...");
    serveStatic(app); // यह API राउट्स से पहले आएगा
  }

  // ✅ Routes register करें
  await registerRoutes(app); // registerRoutes अब HTTP सर्वर वापस नहीं करेगा

  // ✅ Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ✅ Server को Create और Listen करें
  const port = process.env.PORT || 5000; // Render हमेशा PORT env var का उपयोग करेगा

  // Development mode (Vite Dev Server)
  if (app.get("env") === "development") {
    log("Running in development mode...");
    // Vite HMR के लिए एक HTTP सर्वर बनाना
    server = createServer(app); // ✅ यहां HTTP सर्वर बनाएं
    await setupVite(app, server); // devServer को Vite को पास करें
  } else {
    // Production mode (Express सीधे listen करेगा)
    server = createServer(app); // ✅ Production में भी HTTP सर्वर बनाएं
  }

  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port} in ${app.get("env")} mode`);
  });
})();
