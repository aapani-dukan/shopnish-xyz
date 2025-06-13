// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, type Server } from "http";

const app = express();
let   server: Server;

/* ───────────── Middlewares ───────────── */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ───────────── API request logging ───────────── */
app.use((req, res, next) => {
  const start = Date.now();
  const p     = req.path;
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

/* ───────────── bootstrap ───────────── */
(async () => {
  const isDev = app.get("env") === "development";
  if (!isDev) {
    log("Running in production mode, serving static files…");
    serveStatic(app);               // must come before API routes
  }

  await registerRoutes(app);        // register /api routes

  /* global error handler */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status  = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const port = process.env.PORT || 5000;

  if (isDev) {
    log("Running in development mode (Vite HMR)…");
    server = createServer(app);
    await setupVite(app, server);   // inject Vite middlewares
  } else {
    server = createServer(app);     // plain HTTP
  }

  server.listen({ port, host: "0.0.0.0" }, () =>
    log(`Serving on port ${port} in ${app.get("env")} mode`)
  );
})();
