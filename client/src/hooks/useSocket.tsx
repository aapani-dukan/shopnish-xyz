import { useEffect, useState, createContext, useContext } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAuthenticated, isLoadingAuth } = useAuth(); // ✅ isLoadingAuth को भी प्राप्त करें

  useEffect(() => {
    // ✅ Auth loading होने पर कुछ न करें
    if (isLoadingAuth) {
      console.log("SocketProvider: Waiting for AuthProvider to finish loading.");
      return;
    }

    // यदि Authenticated है, User है, और Socket नहीं है, तो कनेक्ट करें
    if (isAuthenticated && user && !socket) {
      console.log("SocketProvider: User authenticated. Connecting socket...");
      const socketUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
      const newSocket = io(socketUrl, {
        transports: ["websocket"],
        withCredentials: true,
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        // ✅ register-client केवल कनेक्ट होने पर भेजें
        newSocket.emit("register-client", {
          role: user.role || "customer",
          userId: user.uid,
        });
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Socket disconnected:", newSocket.id);
      });

      setSocket(newSocket);

      return () => {
        console.log("Socket cleanup: Disconnecting old socket.");
        newSocket.disconnect();
        setSocket(null);
      };
    } 
    // यदि User लॉग आउट हो गया है, तो Socket को डिस्कनेक्ट करें
    else if (!isAuthenticated && socket) {
      console.log("SocketProvider: User logged out, disconnecting socket.");
      socket.disconnect();
      setSocket(null);
    }
  }, [isAuthenticated, user, isLoadingAuth, socket]); // ✅ socket को भी dependency array में जोड़ें

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
