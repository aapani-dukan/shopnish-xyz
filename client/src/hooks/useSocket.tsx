import { useEffect, useState, createContext, useContext } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

// Context type अब सिर्फ Socket या null
const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAuthenticated } = useAuth(); // useAuth से user info

  useEffect(() => {
    // यदि user authenticated नहीं है तो socket disconnect करें
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Backend URL environment variable से लें, fallback localhost
    const socketUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

    const newSocket = io(socketUrl, {
      withCredentials: true,
    });

    setSocket(newSocket);

    // जब connect हो जाए
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);

      if (user) {
        newSocket.emit("register-client", {
          role: user.role,
          userId: user.id,
        });
        console.log("📡 Registered client:", { role: user.role, userId: user.id });
      }
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      console.log("⚡ Socket disconnected");
    };
  }, [isAuthenticated, user]); // ✅ `socket` को dependency array से हटा दिया गया है

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for consuming socket
export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
};
