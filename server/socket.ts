// socket.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

/**
 * Initialize Socket.IO with HTTP server
 * या manually setIO से भी global io set किया जा सकता है
 */
export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("chat:message", (msg) => {
      console.log("💬 Message received:", msg);
      io?.emit("chat:message", msg);
    });

    socket.on("order:update", (data) => {
      console.log("📦 Order update:", data);
      io?.emit("order:update", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  console.log("✅ Socket.IO initialized via initSocket");
  return io;
}

/**
 * Manually set the global io instance
 */
export function setIO(serverIO: Server) {
  io = serverIO;
  console.log("✅ Global Socket.IO instance set via setIO");
}

/**
 * Get the current io instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error("❌ Socket.IO not initialized. Call initSocket or setIO first.");
  }
  return io;
}
