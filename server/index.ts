// index.ts
import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import morgan from "morgan";
import { createServer } from "http";
import registerRoutes from "./routes/registerRoutes";
import { initSocket } from "./socket"; // ✅ सिर्फ यही import

dotenv.config();

const app: Express = express();
const isProd = process.env.NODE_ENV === "production";
let server: ReturnType<typeof createServer>;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: isProd ? process.env.CLIENT_URL : "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan("dev"));

// API routes
app.use("/api", registerRoutes);

// ✅ Socket.IO setup (clean way)
const port = process.env.PORT || 5001;
server = createServer(app);

// सिर्फ यही call करना है, बाकी सब socket.ts संभालेगा
initSocket(server);

// Serve static files in production
if (isProd) {
  const clientDistPath = path.join(__dirname, "client", "dist");
  app.use(express.static(clientDistPath));
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
}

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server
server.listen({ port, host: "0.0.0.0" }, () =>
  console.log(
    `🚀 Server listening on port ${port} in ${isProd ? "production" : "development"} mode`
  )
);

export { app, server };
