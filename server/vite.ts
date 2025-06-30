// server/vite.ts
import express, { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import compression from 'compression';
import sirv from 'sirv';

const isProd = process.env.NODE_ENV === 'production';

let vite: any; // Or ViteDevServer
let serve: any; // Or Sirv handler

export async function setupVite(app: Express) {
  if (!isProd) {
    vite = await createViteServer({
      server: {
        middlewareMode: true, // 'middleware: true' को इससे बदलें
      },
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
export function log(message: string) { // <-- यहाँ 'message: string' जोड़ा
  if (!isProd) {
    console.log('Vite development server active.');
    console.log(message); // <-- यहाँ भी संदेश प्रिंट करें
  } else {
    console.log('Serving static assets in production.');
    console.log(message); // <-- और यहाँ भी
  }
}

