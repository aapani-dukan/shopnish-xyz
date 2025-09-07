import { useEffect, useState, createContext, useContext } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAuthenticated } = useAuth(); 

  useEffect(() => {
    // ✅ सॉकेट को केवल तभी कनेक्ट करें जब उपयोगकर्ता प्रामाणित (authenticated) हो और user ऑब्जेक्ट मौजूद हो।
    if (isAuthenticated && user) {
      const socketUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
      const newSocket = io(socketUrl, {
        withCredentials: true,
      });

      setSocket(newSocket);

      // जब कनेक्ट हो जाए तो client को पंजीकृत करें
      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
        
        // सीधे emit करें क्योंकि user अब null नहीं हो सकता
        newSocket.emit("register-client", {
          role: user.role,
          userId: user.id,
        });
        console.log("📡 Registered client:", { role: user.role, userId: user.id });
      });

      // ✅ cleanup function जो सॉकेट को डिस्कनेक्ट कर देगा
      return () => {
        newSocket.disconnect();
        console.log("⚡ Socket disconnected");
      };
    } else if (socket) {
      // ✅ यदि उपयोगकर्ता लॉगआउट होता है तो मौजूदा सॉकेट को डिस्कनेक्ट करें
      socket.disconnect();
      setSocket(null);
    }
    // ✅ Dependencies: केवल isAuthenticated और user पर निर्भर
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
