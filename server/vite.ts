// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url';

// __dirname को ESM में परिभाषित करें
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

// सुनिश्चित करें कि 'export' कीवर्ड यहां मौजूद है
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// सुनिश्चित करें कि 'export' कीवर्ड यहां मौजूद है
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    configFile: false, // Vite को बताएं कि वह कॉन्फ़िग फ़ाइल की तलाश न करे, हम ऑब्जेक्ट सीधे दे रहे हैं।
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// यह फंक्शन भी export होना चाहिए यदि server/index.ts इसका उपयोग करता है
export function serveStatic(app: Express) {
  // __dirname को ESM में परिभाषित करें (यह यहाँ फिर से परिभाषित किया गया है क्योंकि यह एक अलग स्कोप हो सकता है,
  // या आप इसे फ़ाइल के शीर्ष पर एक बार परिभाषित कर सकते हैं यदि यह सभी फंक्शन्स द्वारा साझा किया गया है)
  const __filenameLocal = fileURLToPath(import.meta.url);
  const __dirnameLocal = path.dirname(__filenameLocal);


  const distPath = path.resolve(__dirnameLocal, "..", "dist"); // dist फोल्डर रूट में होता है
  log(`Checking for build directory at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
