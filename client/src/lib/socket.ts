// client/src/lib/socket.ts
import { io } from "socket.io-client";

// ✅ Dev vs Production दोनों के लिए सही URL
const SOCKET_URL =
  import.meta.env.MODE === "production"
    ? "https://shopnish-lzrf.onrender.com"
    : "http://localhost:5001";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"], // सिर्फ websocket prefer करेगा
  withCredentials: true,
});
