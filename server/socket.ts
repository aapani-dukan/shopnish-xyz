import { Server, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { db } from "./db"; 
import { orders } from "../shared/backend/schema";
import { eq } from "drizzle-orm";
let io: Server | null = null;
export function getIO(): Server {
  if (!io) {
    throw new Error("❌ Socket.IO not initialized. Call initSocket or setIO first.");
  }
  return io;
}

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // ✅ Delivery / Seller / Admin clients register कर सकें
    socket.on("register-client", (data) => {
      console.log("📦 Registered client:", data);
      if (data?.role && data?.userId) {
        socket.join(`${data.role}:${data.userId}`);
        console.log(`✅ Client ${socket.id} joined room ${data.role}:${data.userId}`);
      }
    });

    socket.on("chat:message", (msg) => {
      console.log("💬 Message received:", msg);
      io?.emit("chat:message", msg);
    });

    socket.on("order:update", (data) => {
      console.log("📦 Order update:", data);
      io?.emit("order:update", data);
    });
socket.on('deliveryboy:location_update', async (data: { orderId: number, lat: number, lng: number }) => {
        const serverIo = getIO();
        
        // सुरक्षा और डेटा जाँच
        if (!data.orderId || !data.lat || !data.lng) return;
        
        console.log(`🏍️ Location Update for Order ${data.orderId}: (${data.lat}, ${data.lng})`);

        try {
            // 1. डेटाबेस से customerId खोजें
            const order = await db.query.orders.findFirst({
                where: eq(orders.id, data.orderId),
                columns: { customerId: true }
            });

            if (order?.customerId) {
                // 2. कस्टमर के रूम में रियल-टाइम लोकेशन इवेंट भेजें
                // event: 'order:delivery_location'
                serverIo.to(`user:${order.customerId}`).emit('order:delivery_location', {
                    orderId: data.orderId,
                    lat: data.lat,
                    lng: data.lng,
                    timestamp: new Date().toISOString(),
                });
                console.log(`✅ Location broadcasted to user:${order.customerId}`);
            }
        } catch (error) {
            console.error("❌ Error processing location update:", error);
        }
    });


    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  console.log("✅ Socket.IO initialized via initSocket");
  return io;
}
    
export function setIO(serverIO: Server) {
  io = serverIO;
  console.log("✅ Global Socket.IO instance set via setIO");
}

