import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // ✅ Delivery / Seller / Admin clients register कर सकें
    socket.on("register-client", (data) => {
      console.log("📦 Registered client:", data);
      if (data?.role && data?.userId) {
        socket.join(`${data.role}:${data.userId}`);
        console.log(`✅ Client ${socket.id} joined room ${data.role}:${data.userId}`);
      }
    });

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

export function setIO(serverIO: Server) {
  io = serverIO;
  console.log("✅ Global Socket.IO instance set via setIO");
}

export function getIO(): Server {
  if (!io) {
    throw new Error("❌ Socket.IO not initialized. Call initSocket or setIO first.");
  }
  return io;
}
