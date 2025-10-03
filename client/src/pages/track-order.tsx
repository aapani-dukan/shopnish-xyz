import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useCallback } from "react"; 
import { useAuth } from "@/hooks/useAuth"; 
import { useSocket } from "@/hooks/useSocket";
import GoogleMapTracker from "@/components/GoogleMapTracker";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle,
  User,
  Store
} from "lucide-react";

// -------------------- Interfaces --------------------

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
  items: Array<{
    product: {
      storeId: number;
      store?: StoreType;
    };
  }>;
}

// -------------------- Component --------------------

export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const numericOrderId = orderId ? Number(orderId) : null;

  const { socket } = useSocket(); 
  const { user } = useAuth(); 

  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<Location | null>(null);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${numericOrderId}`],
    enabled: !!numericOrderId,
  });

  const { data: trackingData } = useQuery<OrderTracking[]>({
    queryKey: [`/api/orders/${numericOrderId}/tracking`],
    enabled: !!numericOrderId,
  });

  const tracking: OrderTracking[] = Array.isArray(trackingData) ? trackingData : [];

  // ✅ Location update handler
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

  // ✅ Socket join + event listener
  useEffect(() => {
    if (!socket || !numericOrderId || isLoading || !user) return;

    const userIdToUse = (user as any).id || (user as any).uid;
    if (!userIdToUse) return;

    socket.emit("register-client", { role: "customer", userId: userIdToUse });
    socket.on("order:delivery_location", handleLocationUpdate);

    return () => {
      console.log("🧹 Cleaning up TrackOrder socket");
      socket.off("order:delivery_location", handleLocationUpdate);
    };
  }, [socket, numericOrderId, isLoading, user, handleLocationUpdate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Order not found</h3>
            <p className="text-gray-600">Unable to track this order</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------- Helpers --------------------

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
      case "placed": return "Order Placed";
      case "confirmed": return "Order Confirmed";
      case "preparing": return "Preparing Order";
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Picked Up";
      case "out_for_delivery": return "Out for Delivery";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const estimatedTime = order.estimatedDeliveryTime 
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBD";

  const orderTime = new Date(order.createdAt).toLocaleString("en-IN");
  const store = order.items?.[0]?.product?.store;
  const lastCompletedIndex = tracking.length > 0 ? tracking.findIndex((t) => t.status === order.status) : -1;

  // -------------------- UI --------------------

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
                    {order.deliveryAddress ? (
                      <GoogleMapTracker
                        deliveryBoyLocation={deliveryBoyLocation || undefined}
                        customerAddress={order.deliveryAddress}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                        <p>Delivery address information is missing.</p>
                      </div>
                    )}
                  </div>

                  {deliveryBoyLocation ? (
                    <div className="p-4 border-t">
                      <p className="text-sm font-medium">Delivery Partner Location Updated:</p>
                      <p className="text-xs text-gray-600">
                        Lat: {typeof deliveryBoyLocation.lat === "number" ? deliveryBoyLocation.lat.toFixed(4) : "?"}, 
                        Lng: {typeof deliveryBoyLocation.lng === "number" ? deliveryBoyLocation.lng.toFixed(4) : "?"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Last Update: {new Date(deliveryBoyLocation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 border-t text-center text-gray-500">
                      <p>Waiting for Delivery Partner's location...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Status</span>
                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                    {getStatusText(order.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full ${getStatusColor(order.status)} flex items-center justify-center`}>
                    {order.status === "delivered" ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : order.status === "out_for_delivery" ? (
                      <Truck className="w-6 h-6 text-white" />
                    ) : (
                      <Package className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{getStatusText(order.status)}</p>
                    <p className="text-gray-600">
                      {order.status === "delivered"
                        ? "Your order has been delivered successfully"
                        : order.status === "out_for_delivery"
                        ? `Arriving by ${estimatedTime}`
                        : order.status === "preparing"
                        ? "Your order is being prepared"
                        : "Order confirmed and being processed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {tracking.map((step, index) => {
                    const isCompleted = index <= lastCompletedIndex;
                    return (
                      <div key={step.id || index} className="flex items-center space-x-4">
                        <div className="relative">
                          <div className={`w-4 h-4 rounded-full ${isCompleted ? "bg-green-500" : "bg-gray-300"}`}>
                            {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          {index < tracking.length - 1 && (
                            <div className={`absolute top-4 left-2 w-0.5 h-6 ${isCompleted ? "bg-green-500" : "bg-gray-300"}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? "text-gray-900" : "text-gray-500"}`}>
                            {getStatusText(step.status)}
                          </p>
                          {step.timestamp && (
                            <p className="text-sm text-gray-600">{new Date(step.timestamp).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Boy */}
            {order.deliveryBoy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Delivery Partner</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {order.deliveryBoy?.firstName} {order.deliveryBoy?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">Delivery Partner</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Order Total</span>
                    <span className="font-medium">₹{order.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment</span>
                    <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                      {order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online"}
                    </Badge>
                  </div>
                  <hr />
                  <div className="text-sm text-gray-600">
                    <p className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Estimated delivery: {estimatedTime}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Info */}
            {store && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="w-5 h-5" />
                    <span>Store Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{store?.storeName || "Unnamed Store"}</p>
                    <p className="text-sm text-gray-600">{store?.address || "No address available"}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-600">Contact Store</span>
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Delivery Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{order.deliveryAddress?.fullName || "N/A"}</p>
                    <p className="text-sm text-gray-600">{order.deliveryAddress?.address || "N/A"}</p>
                    <p className="text-sm text-gray-600">
                      {order.deliveryAddress?.city || "N/A"}, {order.deliveryAddress?.pincode || ""}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{order.deliveryAddress?.phone || "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
                    }
