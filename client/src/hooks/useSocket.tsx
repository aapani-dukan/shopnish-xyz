// client/src/hooks/useSocket.tsx

import React, { useEffect, useState, createContext, useContext, useRef, useMemo } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    if (isAuthenticated && user) {
      if (socketRef.current && socketRef.current.connected) {
        return;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }

      const socketUrl = import.meta.env.VITE_API_BASE_URL || " https://shopnish-lzrf.onrender.com";
      const newSocket = io(socketUrl, {
        transports: ["websocket"],
        withCredentials: true,
        auth: {
          token: user.idToken,
          role: user.role,
          userId: user.uid,
        },
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        setIsConnected(true);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
        setIsConnected(false);
        if (socketRef.current === newSocket) {
          socketRef.current = null;
        }
      });

      newSocket.on("connect_error", (err) => {
        console.error("❌ Socket connection error:", err.message);
        setIsConnected(false);
        if (socketRef.current === newSocket) {
          socketRef.current = null;
        }
      });

      socketRef.current = newSocket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, isLoadingAuth, user?.uid, user?.idToken, user?.role]);

  // ✅ अब contextValue हमेशा fresh रहेगा
  const contextValue: SocketContextType = {
    socket: socketRef.current,
    isConnected,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
