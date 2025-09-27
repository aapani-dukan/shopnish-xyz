// client/src/hooks/useSocket.tsx

import React, { useEffect, useState, createContext, useContext, useRef } from "react";
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
    // 🔌 अगर auth loading है → कोई socket नहीं
    if (isLoadingAuth) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // 🔌 अगर user authenticated नहीं है → socket बंद
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // ✅ Authenticated + user available
    if (isAuthenticated && user) {
      // अगर पहले से connected है तो नया मत बनाओ
      if (socketRef.current && socketRef.current.connected) {
        return;
      }

      // पहले वाले को disconnect करो
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }

      const socketUrl =
        import.meta.env.VITE_API_BASE_URL || "https://shopnish-00ug.onrender.com";

      const newSocket = io(socketUrl, {
       // transports: ["websocket"],
        withCredentials: true,
        auth: {
          token: user.idToken,
          role: user.role,
          userId: user.uid,
        },
      });

      // 🔍 Debug
      console.log("🚀 Created socket:", newSocket);
      console.log("🔑 Keys:", Object.keys(newSocket));
      console.log("✅ typeof newSocket.on:", typeof (newSocket as any).on);

      // ✅ Extra check: क्या newSocket.on function है?
      if (typeof (newSocket as any).on === "function") {
        newSocket.on("connect", () => {
          console.log("✅ Socket connected:", newSocket.id);
          setIsConnected(true);
        });

        newSocket.on("disconnect", (reason: string) => {
          console.log("❌ Socket disconnected:", reason);
          setIsConnected(false);
          if (socketRef.current === newSocket) {
            socketRef.current = null;
          }
        });

        newSocket.on("connect_error", (err: Error) => {
          console.error("❌ Socket connection error:", err.message);
          setIsConnected(false);
          if (socketRef.current === newSocket) {
            socketRef.current = null;
          }
        });
      } else {
        console.error("⚠️ newSocket.on is not a function!", newSocket);
      }

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
