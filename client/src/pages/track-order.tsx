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

  // ✅ Track current live delivery boy location (from GPS)
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<Location | null>(null);

  // ✅ Fetch order details
  const { data: order, isLoading } = useQuery<Order | null>({
    queryKey: ["/api/orders", numericOrderId],
    queryFn: async () => {
      if (!numericOrderId) return null;
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("User not authenticated");

        const res = await fetch(`/api/orders/${numericOrderId}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      } catch (error) {
        console.error("Order fetch error:", error);
        return null;
      }
    },
    enabled: !!numericOrderId,
  });

  // ✅ Fetch order tracking status
  const { data: trackingData } = useQuery<OrderTracking[]>({
    queryKey: ["/api/orders/tracking", numericOrderId],
    queryFn: async () => {
      if (!numericOrderId) return [];
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("User not authenticated");

        const res = await fetch(`/api/orders/${numericOrderId}/tracking`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Tracking fetch error:", error);
        return [];
      }
    },
    enabled: !!numericOrderId,
  });

  const tracking: OrderTracking[] = Array.isArray(trackingData) ? trackingData : [];

  // ✅ Listen for live location updates from delivery partner via socket
  const handleLocationUpdate = useCallback(
    (data: Location & { orderId: number; timestamp?: string }) => {
      if (data.orderId === numericOrderId) {
        setDeliveryBoyLocation({
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    },
    [numericOrderId]
  );

    useEffect(() => {
  if (!socket || !numericOrderId || isLoading || !user) return;

  const userIdToUse = (user as any).id || (user as any).uid;
  if (!userIdToUse) return;

  // Register customer client
  socket.emit("register-client", { role: "customer", userId: userIdToUse });

  // Join specific order room
  socket.emit("join-order-room", { orderId: numericOrderId });

  const handleLocationUpdate = (data: Location & { orderId: number; timestamp?: string }) => {
    console.log("📍 Location update received:", data);
    if (data.orderId === numericOrderId) {
      setDeliveryBoyLocation({
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }
  };

  socket.on("order:delivery_location", handleLocationUpdate);

  return () => {
    socket.off("order:delivery_location", handleLocationUpdate);
  };
}, [socket, numericOrderId, isLoading, user]);



  // ✅ Fallback logic
  const deliveryBoyLocationToShow = deliveryBoyLocation || order?.deliveryLocation || null;
  const customerAddress = order?.deliveryAddress;

  // ✅ Status color & text helpers
  const getStatusColor = (status: string) => {
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
        return "Cancelled";
      default:
        return status;
    }
  };

  const estimatedTime = order?.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "TBD";
  const store = order?.items?.[0]?.product?.store;


if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
}
if (!order || !order.deliveryAddress) { 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-medium mb-2">Order not found or data missing</h3>
            <p className="text-gray-600">Unable to track this order or some data is still loading.</p>
          </CardContent>
        </Card>
      </div>
    );
}

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
                    {customerAddress && deliveryBoyLocationToShow ? (
                      <GoogleMapTracker
                        deliveryBoyLocation={deliveryBoyLocationToShow}
                        customerAddress={customerAddress}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <p>Delivery address or location information is missing.</p>
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

            {/* Order Status Timeline */}
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

          {/* Order Details */}
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

            {/* Store Info */}
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
