// client/src/hooks/useSocket.tsx

import React, { useEffect, useState, createContext, useContext, useRef, useMemo } from "react"; // ✅ useRef और useMemo जोड़ा
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth"; // ✅ सुनिश्चित करें कि यह @/hooks का उपयोग करता है

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean; // ✅ कनेक्शन स्थिति के लिए
}

const SocketContext = createContext<SocketContextType | undefined>(undefined); // ✅ context value के लिए एक ऑब्जेक्ट का उपयोग करें

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  
  // ✅ useRef का उपयोग करके सॉकेट इंस्टेंस को बनाए रखें, ताकि यह री-रेंडर पर न बदले
  const socketRef = useRef<Socket | null>(null);
  
  // ✅ isConnected स्थिति को प्रबंधित करने के लिए useState
  const [isConnected, setIsConnected] = useState(false);

  // ✅ DEBUG LOGS: देखें कि क्या बदल रहा है
  console.log("--- SocketProvider Render ---");
  console.log("  Auth State: isAuthenticated:", isAuthenticated, "isLoadingAuth:", isLoadingAuth, "user:", user ? user.email : "null");
  console.log("  Socket State: isConnected:", isConnected, "socketRef.current:", socketRef.current ? "present" : "null");
  console.log("---------------------------");

  useEffect(() => {
    console.log(">>> SocketProvider useEffect triggered <<<");
    console.log("  Deps for this run: isAuthenticated:", isAuthenticated, "isLoadingAuth:", isLoadingAuth, "user:", user ? user.email : "null");

    // 1. यदि Auth अभी भी लोड हो रहा है, तो कुछ न करें।
    if (isLoadingAuth) {
      console.log("  SocketProvider: Waiting for AuthProvider to finish loading.");
      // यदि auth लोड हो रहा है और कोई socketRef है, तो उसे डिस्कनेक्ट करें
      if (socketRef.current) {
        console.log("  Socket cleanup: Disconnecting old socket while auth is loading.");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // 2. यदि User लॉग आउट हो गया है (isAuthenticated false है)
    if (!isAuthenticated) {
      if (socketRef.current) {
        console.log("  Socket cleanup: Disconnecting old socket due to logout.");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      console.log("  SocketProvider: User not authenticated, no socket connection.");
      return; // आगे न बढ़ें
    }

    // 3. यदि User Authenticated है और `user` ऑब्जेक्ट मौजूद है
    if (isAuthenticated && user) {
        // यदि पहले से एक कनेक्टेड सॉकेट है, तो उसे बनाए रखें
        if (socketRef.current && socketRef.current.connected) {
            console.log("  SocketProvider: Already connected, ensuring no duplicate connection.");
            // हम यहां कोई जटिल री-कनेक्शन लॉजिक नहीं डाल रहे हैं,
            // क्योंकि `user?.uid` (या `user?.idToken`) के बदलने पर ही `useEffect` फिर से चलेगा।
            // यदि user.idToken बदलता है, तो नया सॉकेट बनाने के लिए पुराना डिस्कनेक्ट हो जाएगा।
            return; 
        }

        // यदि कोई मौजूदा सॉकेट है लेकिन वह डिस्कनेक्ट हो गया है, या नया कनेक्शन चाहिए
        if (socketRef.current) {
          console.log("  Socket cleanup: Disconnecting any old, non-connected socket instance.");
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        }

        console.log("  SocketProvider: User authenticated. Connecting new socket...");
        const socketUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
        const newSocket = io(socketUrl, {
            transports: ["websocket"],
            withCredentials: true,
            auth: { // ✅ `useAuth` से `user.idToken` भेजें
                token: user.idToken, 
                role: user.role,
                userId: user.uid,
            },
        });

        newSocket.on("connect", () => {
            console.log("✅ Socket connected:", newSocket.id);
            setIsConnected(true);
            // ✅ `register-client` को यहां भेजने की आवश्यकता नहीं है
            // क्योंकि auth token में ही रोल और userId भेज दिए जाते हैं।
            // सर्वर को auth middleware से यह जानकारी मिल जाएगी।
            // यदि फिर भी `register-client` आवश्यक है, तो इसे यहीं भेजें।
            // newSocket.emit("register-client", {
            //   role: user.role || "customer",
            //   userId: user.uid,
            // });
        });

        newSocket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected. Reason:", reason);
            setIsConnected(false);
            // यदि यह सॉकेट रेफरेंस वाला सॉकेट है, तो इसे null करें
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

        socketRef.current = newSocket; // useRef को नया सॉकेट असाइन करें

        // cleanup function - useEffect unmount होने पर या डिपेंडेंसी बदलने पर चलेगा
        return () => {
          console.log("  Socket cleanup: Disconnecting socket on unmount or dependency change.");
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
          setIsConnected(false);
        };
    }

  }, [isAuthenticated, isLoadingAuth, user?.uid, user?.idToken, user?.role]); // ✅ केवल उन primitive values पर निर्भर करें जो वास्तव में बदलती हैं
  // user ऑब्जेक्ट का पूरा रेफरेंस बदलने के बजाय, उसके विशिष्ट स्थिर गुणों पर निर्भर करें।

  // ✅ useMemo का उपयोग करें ताकि context value का रेफरेंस केवल तभी बदले जब isConnected या socketRef.current बदलता है
  const contextValue = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
  }), [socketRef.current, isConnected]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext); // ✅ context object प्राप्त करें
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context; // ✅ पूरा context object return करें
};
