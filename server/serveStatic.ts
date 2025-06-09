// server/serveStatic.ts
import path from "path";
import express, { Express } from "express";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  // Static files serve करें
  app.use(express.static(distPath));

  // ✅ React Router fallback: unknown path पर भी index.html मिले
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
