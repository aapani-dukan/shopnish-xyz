// server/vite.ts
import express, { Express } from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import compression from 'compression';
import sirv from 'sirv'; // sirv का डिफ़ॉल्ट एक्सपोर्ट एक फ़ैक्टरी फ़ंक्शन होता है

// प्रोडक्शन मोड निर्धारित करें
const isProd = process.env.NODE_ENV === 'production';

let vite: ViteDevServer; // Vite डेवलपमेंट सर्वर इंस्टेंस
let prodServeStaticMiddleware: ReturnType<typeof sirv>; // sirv द्वारा रिटर्न किया गया मिडलवेयर फंक्शन

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
 * स्टैटिक एसेट्स को सर्व करने के लिए मिडलवेयर।
 * डेवलपमेंट में Vite द्वारा संभाला जाता है, प्रोडक्शन में sirv द्वारा।
 */
export const serveStatic = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (isProd) {
    // प्रोडक्शन में, sirv मिडलवेयर को कॉल करें
    // prodServeStaticMiddleware पहले ही setupVite में app.use() के साथ जुड़ चुका है।
    // तो, यहां इसे सीधे कॉल करने की आवश्यकता नहीं है, next() पर कॉल करने से काम चलेगा
    // जब तक कि आपके पास कोई विशिष्ट तर्क न हो कि इसे यहाँ फिर से क्यों हैंडल किया जाए।
    // आमतौर पर, app.use(prodServeStaticMiddleware) पर्याप्त होता है।
    // यदि आप इसे केवल एक स्पेसिफिक पाथ पर संलग्न करना चाहते हैं, तो आप इसे यहां से हटा सकते हैं
    // और इसे app.get('*', serveStatic) जैसी जगह पर उपयोग कर सकते हैं।
    // लेकिन आम तौर पर, यदि यह `app.use()` के साथ जोड़ा गया है, तो यह हर अनुरोध पर चलेगा।

    // यदि आप चाहते हैं कि यह केवल कुछ विशिष्ट रूट्स के लिए काम करे, तो app.use() का उपयोग करें
    // इसके बजाय सीधे `app.get('*', serveStatic)` के साथ, या सुनिश्चित करें कि sirv को
    // एक वाइल्डकार्ड रूट से पहले लगाया गया है।

    // मौजूदा सेटअप के आधार पर, यह बस next() पर कॉल करेगा
    // क्योंकि sirv पहले ही app.use(prodServeStaticMiddleware) में जुड़ा हुआ है।
    next();
  } else {
    next(); // डेवलपमेंट में, Vite संभालता है, इसलिए next() पर कॉल करें
  }
};

/**
 * कंसोल में संदेश लॉग करता है, जो dev/prod मोड को दर्शाता है।
 */
export function log(message: string) {
  console.log(message);
}
