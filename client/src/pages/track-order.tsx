import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuth } from "firebase/auth";
import GoogleMapTracker from "@/components/GoogleMapTracker";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  User,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

// ----------------------------
// ✅ Interfaces (Unchanged)
// ----------------------------
interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}
interface DeliveryAddress {
  fullName: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
}
interface OrderTracking {
  id?: number;
  orderId: number;
  status: string;
  location?: string;
  timestamp?: string;
  notes?: string;
}
interface DeliveryBoy {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
}
interface StoreType {
  id: number;
  storeName: string;
  address: string;
  phone: string;
}
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  deliveryAddress?: DeliveryAddress;
  estimatedDeliveryTime?: string;
  createdAt: string;
  deliveryBoyId?: number;
  deliveryBoy?: DeliveryBoy;
  deliveryLocation?: Location;
  items: Array<{
    product: {
      storeId: number;
      store?: StoreType;
    };
  }>;
}


export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const numericOrderId = orderId ? Number(orderId) : null;

  const { socket } = useSocket();
  const { user } = useAuth();

  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<Location | null>(null);

  const { data: order, isLoading, isFetching } = useQuery<Order | null>({
    queryKey: ["/api/orders", numericOrderId],
    queryFn: async () => { /* ... fetch logic ... */ },
    enabled: !!numericOrderId,
  });

  const { data: trackingData } = useQuery<OrderTracking[]>({
    queryKey: ["/api/orders/tracking", numericOrderId],
    queryFn: async () => { /* ... fetch logic ... */ },
    enabled: !!numericOrderId,
  });

  const tracking: OrderTracking[] = Array.isArray(trackingData) ? trackingData : [];

// 🚀 FIX 2: useEffect Logic (isFetching के दौरान Socket Update को ब्लॉक करें)
useEffect(() => {
  if (!socket || !numericOrderId || !user || !order || !order.deliveryBoyId) return; 
  
  const userIdToUse = (user as any).id || (user as any).uid;
  if (!userIdToUse) return;

  socket.emit("register-client", { role: "customer", userId: userIdToUse });
  socket.emit("join-order-room", { orderId: numericOrderId });

  const handleSocketLocationUpdate = (data: Location & { orderId: number; timestamp?: string }) => {
    console.log("📍 Location update received:", data);
    
    // setDeliveryBoyLocation को ब्लॉक करें जब order रिफ़ेच हो रहा हो।
    if (data.orderId === numericOrderId && !isFetching) {
      setDeliveryBoyLocation({
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }
  };

  socket.on("order:delivery_location", handleSocketLocationUpdate);

  return () => {
    socket.off("order:delivery_location", handleSocketLocationUpdate);
  };
// dependencies में order और isFetching को जोड़ें।
}, [socket, numericOrderId, user, order, isFetching]); 
  
  // ✅ Status color & text helpers (Unchanged)
  const getStatusColor = (status: string) => {
    // ... logic unchanged
    switch (status) {
        case "placed":
        case "confirmed":
            return "bg-blue-500";
        case "preparing":
            return "bg-yellow-500";
        case "ready":
        case "picked_up":
            return "bg-orange-500";
        case "out_for_delivery":
            return "bg-purple-500";
        case "delivered":
            return "bg-green-500";
        case "cancelled":
            return "bg-red-500";
        default:
            return "bg-gray-500";
    }
  };
  const getStatusText = (status: string) => {
    // ... logic unchanged
    switch (status) {
        case "placed":
            return "Order Placed";
        case "confirmed":
            return "Order Confirmed";
        case "preparing":
            return "Preparing Order";
        case "ready":
            return "Ready for Pickup";
        case "picked_up":
            return "Picked Up";
        case "out_for_delivery":
            return "Out for Delivery";
        case "delivered":
            return "Delivered";
        case "cancelled":
        default:
            return status;
    }
  };


// ✅ Loading/Guard Checks (Unchanged)
if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
}

if (!order || !order.deliveryAddress || !order.items || order.items.length === 0) { 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-medium mb-2">Order Not Ready or Data Missing</h3>
            <p className="text-gray-600">Please wait while we prepare the tracking information, or try refreshing.</p>
          </CardContent>
        </Card>
      </div>
    );
}

// 🚀 FINAL DECISIVE FIX: deliveryBoyLocationToShow को useMemo में रैप करें, और Dependencies को सुरक्षित करें।
const deliveryBoyLocationToShow = useMemo(() => {
    return deliveryBoyLocation || order.deliveryLocation || null;
}, [
    deliveryBoyLocation,
    // dependencies में केवल primitive values (lat/lng) या null/undefined को ही पास करें।
    order.deliveryLocation?.lat, 
    order.deliveryLocation?.lng 
]); 

const customerAddress = order.deliveryAddress; 

const estimatedTime = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "TBD";
const store = order.items?.[0]?.product?.store; 


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-lg text-gray-600">Order #{order.orderNumber}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {(order.status === "picked_up" || order.status === "out_for_delivery") && order.deliveryBoyId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span>Real-Time Tracking</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full h-80">
                    {/* GoogleMapTracker को अब एक स्थिर 'deliveryBoyLocationToShow' प्रॉप मिल रहा है */}
                    {customerAddress && deliveryBoyLocationToShow ? (
                      <GoogleMapTracker
                        deliveryBoyLocation={deliveryBoyLocationToShow}
                        customerAddress={customerAddress}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <p>Waiting for Delivery Partner's location...</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t text-center text-gray-500">
                    {deliveryBoyLocationToShow ? (
                      <>
                        <p className="text-sm font-medium">Delivery Partner Location Updated:</p>
                        <p className="text-xs text-gray-600">
                          Lat: {deliveryBoyLocationToShow.lat.toFixed(4)}, Lng:{" "}
                          {deliveryBoyLocationToShow.lng.toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Last Update: {new Date(deliveryBoyLocationToShow.timestamp).toLocaleTimeString()}
                        </p>
                      </>
                    ) : (
                      <p>Waiting for Delivery Partner's location...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Status Timeline (Unchanged) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span>Order Status Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.map((track, idx) => (
                    <div key={idx} className="flex items-center space-x-4">
                      <Badge className={`${getStatusColor(track.status)} py-1 px-2 rounded`}>
                        {getStatusText(track.status)}
                      </Badge>
                      {track.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(track.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                      {track.notes && (
                        <span className="text-xs text-gray-400 italic">- {track.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details (Unchanged) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-green-500" />
                  <span>Order Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`${getStatusColor(order.status)} py-1 px-2 rounded text-white`}>
                    {getStatusText(order.status)}
                  </span>
                </p>
                <p>
                  <strong>Estimated Delivery Time:</strong> {estimatedTime}
                </p>
                <p>
                  <strong>Payment Method:</strong> {order.paymentMethod}
                </p>
                <p>
                  <strong>Total:</strong> ₹{order.total}
                </p>
              </CardContent>
            </Card>

            {/* Store Info (Unchanged) */}
            {store && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="w-5 h-5 text-orange-500" />
                    <span>Store Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    <strong>Name:</strong> {store?.storeName}
                  </p>
                  <p>
                    <strong>Address:</strong> {store?.address}
                  </p>
                  <p>
                    <strong>Phone:</strong> {store?.phone}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
        }
