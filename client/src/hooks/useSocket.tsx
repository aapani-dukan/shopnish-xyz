import { useEffect, useState, createContext, useContext } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

      const newSocket = io(socketUrl, {
        transports: ["websocket"], // ⚡ recommended
        withCredentials: true,
      });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);

        // ✅ Firebase user.uid का इस्तेमाल करो
        newSocket.emit("register-client", {
          role: user.role || "customer", // अगर role missing हो तो default
          userId: user.uid,
        });
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", newSocket.id);
      });

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
};
