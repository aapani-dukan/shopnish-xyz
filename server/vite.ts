// server/vite.ts
import express, { type Express } from "express";
import fs   from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const viteLogger = createLogger();

export function log(msg: string, src = "express") {
  const t = new Date().toLocaleTimeString("en-US", { hour12: true });
  console.log(`${t} [${src}] ${msg}`);
}

/* ─────────────── Dev-mode: Vite middleware & HMR ─────────────── */
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (m, o) => { viteLogger.error(m, o); process.exit(1); }
    },
    server: { middlewareMode: true, hmr: { server }, allowedHosts: true },
    appType: "custom"
  });

  app.use(vite.middlewares);

  // Always serve fresh index.html in dev
  app.use("*", async (req, res, next) => {
    try {
      const templatePath = path.resolve(__dirname, "..", "client", "index.html");
      let html = await fs.promises.readFile(templatePath, "utf-8");
      html     = html.replace(`src="/src/main.tsx"`,
                              `src="/src/main.tsx?v=${nanoid()}"`);
      html     = await vite.transformIndexHtml(req.originalUrl, html);
      res.status(200).type("html").end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/* ─────────────── Prod-mode: serve built static files ─────────────── */
export function serveStatic(app: Express) {
  // React build अब root/dist में है
  const distPath = path.resolve(__dirname, "..", "dist");
  log(`Serving static files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌  Build folder not found: ${distPath}. Run "npm run build" first.`
    );
  }

  // Static assets
  app.use(express.static(distPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
