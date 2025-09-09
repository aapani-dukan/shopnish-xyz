// client/src/lib/socket.ts
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "production"
    ? (import.meta.env.VITE_API_BASE_URL || "https://shopnish-lzrf.onrender.com")
    : (import.meta.env.VITE_SOCKET_URL || "http://localhost:5001");

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

// useful debug logs (remove or silence in prod if you want)
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});
socket.on("disconnect", (reason) => {
  console.warn("❌ Socket disconnected:", reason);
});
socket.on("connect_error", (err: any) => {
  console.error("⚠️ Socket connect error:", err?.message || err);
});
