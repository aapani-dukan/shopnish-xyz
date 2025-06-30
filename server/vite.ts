// server/vite.ts
import { defineConfig, build } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import sirv from 'sirv';
import { createServer } from 'node:http';

// ...

async function createDevServer() {
  const app = express();
  const server = createServer(app);

  const vite = await (
    await import('vite')
  ).createServer({
    logLevel: 'info',
    server: {
      middlewareMode: true,
      hmr: { server },
      // `allowedHosts` को boolean के बजाय true या string[] के रूप में सेट करें
      allowedHosts: true, // या ['localhost', '.render.com']
    },
  });

  // ...
}
