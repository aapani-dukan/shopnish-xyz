// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, log, serveStatic } from "./vite";

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Request Logging (यह ठीक है, क्योंकि यह केवल लॉगिंग है)
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
  const server = null; // ✅ server variable को यहां null पर इनिशियलाइज़ करें या हटा दें

  // ✅ Production mode में, सबसे पहले स्टैटिक फ़ाइलें सर्व करें
  // यह सुनिश्चित करता है कि आपके React ऐप की फाइलें किसी भी API राउट से पहले सर्व हों
  if (app.get("env") !== "development") { // 'else' की बजाय '!=="development"' बेहतर है
    log("Running in production mode, serving static files...");
    serveStatic(app); // <-- यह लाइन अब API राउट्स से पहले है
  }

  // ✅ Routes register करें (ये अब static files के बाद आएंगे)
  // registerRoutes अब एक Express Router return करना चाहिए, न कि एक HTTP Server
  const registeredServer = await registerRoutes(app); // यदि registerRoutes एक http.Server वापस करता है
  // यदि registerRoutes सिर्फ router जोड़ता है तो इसे ऐसे रहने दें, या app.use(router) करें

  // ✅ Error Handler (यह अभी भी सबसे आखिर में आ सकता है)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ✅ Serve frontend (Vite dev server in dev, static build in prod)
  // Dev mode में, Vite middleware को API राउट्स के बाद रखें,
  // लेकिन सभी catch-all routes से पहले ताकि Vite HTML को हैंडल कर सके।
  if (app.get("env") === "development") {
    // Vite Dev Server के लिए HTTP सर्वर बनाना
    const devServer = registeredServer || (await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s)); // एक ephemeral port पर listen करें, Vite HMR के लिए
    }));
    await setupVite(app, devServer); // devServer को Vite को पास करें
  }

  // ✅ Start server
  const port = 5000; // Render पर यह process.env.PORT होगा
  // server.listen के बजाय registeredServer.listen का उपयोग करें यदि registerRoutes एक server object देता है।
  // आदर्श रूप से, Express ऐप खुद listen करे।
  app.listen(port, "0.0.0.0", () => { // app.listen का उपयोग करें
    log(`serving on port ${port} in ${app.get("env")} mode`);
  });
})();
