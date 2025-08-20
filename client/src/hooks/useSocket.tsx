// client/src/hooks/useSocket.tsx

import { useEffect, useState, createContext, useContext } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth"; // useAuth हुक को आयात करें

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, isAuthenticated } = useAuth(); // ✅ useAuth से उपयोगकर्ता की जानकारी प्राप्त करें

  useEffect(() => {
    // ✅ जब तक उपयोगकर्ता प्रमाणित नहीं होता, हम सॉकेट को कनेक्ट नहीं करेंगे।
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // ✅ अपने सर्वर का URL डालें
    const newSocket = io("https://shopnish-lzrf.onrender.com");

    setSocket(newSocket);

    // ✅ उपयोगकर्ता के प्रमाणित होने पर सॉकेट को उनके रोल और UID के साथ रजिस्टर करें
    newSocket.on("connect", () => {
      if (user) {
        newSocket.emit("register-client", {
          role: user.role,
          userId: user.id,
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={{ socket }}>
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
