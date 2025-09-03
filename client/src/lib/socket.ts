// client/src/lib/socket.ts
import { io } from "socket.io-client";

export const socket = io("https://shopnish-lzrf.onrender.com", {
  transports: ["websocket"],
  withCredentials: true,
});
