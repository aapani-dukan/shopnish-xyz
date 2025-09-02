// socket.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

// Initialize Socket.IO with existing HTTP server
export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // frontend origin
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // Example: listening for chat messages
    socket.on("chat:message", (msg) => {
      console.log("💬 Message received:", msg);
      io?.emit("chat:message", msg); // broadcast to all clients
    });

    // Example: custom event for order updates
    socket.on("order:update", (data) => {
      console.log("📦 Order update:", data);
      io?.emit("order:update", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  console.log("✅ Socket.IO initialized");
  return io;
}

// Get current io instance anywhere
export function getIO() {
  if (!io) {
    throw new Error("❌ Socket.IO not initialized. Call initSocket first.");
  }
  return io;
}
