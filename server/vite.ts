// server/vite.ts
import express, { Express } from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import compression from 'compression';
import sirv from 'sirv'; // sirv का डिफ़ॉल्ट एक्सपोर्ट एक फ़ैक्टरी फ़ंक्शन होता है

// प्रोडक्शन मोड निर्धारित करें
const isProd = process.env.NODE_ENV === 'production';

let vite: ViteDevServer; // Vite डेवलपमेंट सर्वर इंस्टेंस

// sirv द्वारा रिटर्न किया गया मिडलवेयर फंक्शन।
// इसे ग्लोबल रखें ताकि setupVite इसे इनिशियलाइज़ कर सके
// और मुख्य एक्सप्रेस ऐप इसे उपयोग कर सके।
let prodServeStaticMiddleware: ReturnType<typeof sirv>;

export async function setupVite(app: Express) {
  if (!isProd) {
    // डेवलपमेंट मोड: Vite सर्वर को मिडलवेयर के रूप में उपयोग करें
    vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    log('Vite development server active.');
  } else {
    // प्रोडक्शन मोड: compression और sirv का उपयोग करें
    app.use(compression());

    // sirv मिडलवेयर को यहाँ इनिशियलाइज़ करें
    // 'client/dist' वह पाथ है जहाँ Vite आपकी क्लाइंट-साइड बिल्ड आउटपुट करता है
    prodServeStaticMiddleware = sirv('client/dist', {
      etag: true,
      maxAge: 31536000, // 1 साल के लिए कैश करें
      immutable: true, // फाइलों को अपरिवर्तनीय के रूप में चिह्नित करें
    });

    // production में इसे एक्सप्रेस मिडलवेयर के रूप में उपयोग करें
    app.use(prodServeStaticMiddleware);
    log('Serving static assets in production.');
  }
}

/**
 * कंसोल में संदेश लॉग करता है, जो dev/prod मोड को दर्शाता है।
 */
export function log(message: string) {
  console.log(message);
}

// महत्वपूर्ण: serveStatic फंक्शन को हटा दिया गया है क्योंकि
// sirv मिडलवेयर को सीधे app.use() के साथ जोड़ा गया है
// और यह अपना काम स्वयं करेगा।
