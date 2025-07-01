import express, { Express } from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import compression from 'compression';
import sirv from 'sirv';
import path from 'path'; // ✅ path module import किया गया

const isProd = process.env.NODE_ENV === 'production';

let vite: ViteDevServer;
let prodServeStaticMiddleware: ReturnType<typeof sirv>;

export async function setupVite(app: Express) {
  if (!isProd) {
    // डेवलपमेंट मोड: Vite को मिडलवेयर के रूप में चलाएं
    vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    log('✅ Vite development server active.');
  } else {
    // प्रोडक्शन मोड: compression और sirv के साथ static files सर्व करें
    app.use(compression());

    prodServeStaticMiddleware = sirv('dist/client-static', {
      etag: true,
      maxAge: 31536000,
      immutable: true,
    });

    app.use(prodServeStaticMiddleware);

    const staticPath = path.resolve(process.cwd(), 'dist', 'client-static');
    log(`✅ Serving static assets in production from: ${staticPath}`);
  }
}

export function log(message: string) {
  console.log(message);
}
