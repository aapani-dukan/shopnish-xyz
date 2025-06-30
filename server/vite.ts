// server/vite.ts
import express, { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import compression from 'compression'; // Add this import
import sirv from 'sirv'; // Add this import

const isProd = process.env.NODE_ENV === 'production';

let vite: any; // Or ViteDevServer
let serve: any; // Or Sirv handler

export async function setupVite(app: Express) {
  if (!isProd) {
    vite = await createViteServer({
      server: { middleware: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(compression());
    serve = sirv('Client/dist', { // Path to your client-side build output
      etag: true,
      maxAge: 31536000, // 1 year
    });
  }
}

export const serveStatic = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (isProd) {
    return serve(req, res, next);
  } else {
    next(); // In dev, Vite handles serving
  }
};

export function log() {
  if (!isProd) {
    console.log('Vite development server active.');
  } else {
    console.log('Serving static assets in production.');
  }
}
