// ✅ Updated Front-end File: deliverydashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Package,
  Clock,
  CheckCircle,
  Navigation,
  Loader2,
} from "lucide-react";

// Helper components & hooks
import DeliveryOtpDialog from "./DeliveryOtpDialog";
import DeliveryOrdersList from "./DeliveryOrdersList";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { apiRequest } from "@/lib/queryClient";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// --- Utility Functions ---
const statusColor = (status: string) => {
  switch (status) {
    case "ready_for_pickup":
    case "accepted":
      return "bg-yellow-500";
    case "picked_up":
      return "bg-blue-500";
    case "out_for_delivery":
      return "bg-purple-500";
    case "delivered":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const statusText = (status: string) => {
  switch (status) {
    case "pending":
      return "लंबित";
    case "accepted":
      return "विक्रेता ने स्वीकार किया"; // Seller Accepted
    case "preparing":
      return "तैयार हो रहा है"; // Preparing
    case "ready_for_pickup":
      return "पिकअप के लिए तैयार"; // Ready for Pickup
    case "picked_up":
      return "पिकअप हो गया"; // Picked Up
    case "out_for_delivery":
      return "डिलीवरी के लिए निकला"; // Out for Delivery
    case "delivered":
      return "डिलीवर हो गया"; // Delivered
    default:
      return status || "अज्ञात";
  }
};

const nextStatus = (status: string) => {
  switch (status) {
    case "ready_for_pickup":
      return "picked_up";
    case "picked_up":
      return "out_for_delivery";
    case "out_for_delivery":
      return "delivered";
    default:
      return null;
  }
};

const nextStatusLabel = (status: string) => {
  switch (status) {
    case "ready_for_pickup":
      return "पिकअप हो गया";
    case "picked_up":
      return "डिलीवरी के लिए निकला";
    case "out_for_delivery":
      return "डिलीवरी पूरी करें";
    default:
      return "";
  }
};

// --- Main Component ---
export default function DeliveryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, setUser, auth, isLoadingAuth, isAuthenticated } = useAuth();
  const rawSocket = useSocket() as any;
  const socket = rawSocket?.socket ?? rawSocket;

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);

  useEffect(() => {
    if (!user || !auth?.currentUser) return;
    try {
      const deliveryBoyId = user?.deliveryBoyId;
      if (deliveryBoyId !== undefined) {
        const deliveryBoyUser = { ...user, deliveryBoyId };
        sessionStorage.setItem("deliveryBoyUser", JSON.stringify(deliveryBoyUser));
        setUser(deliveryBoyUser);
      }
    } catch (err) {
      console.error("Delivery boy session store error:", err);
    }
  }, [user, setUser, auth?.currentUser]);

  const getValidToken = async () => {
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (err) {
      console.error("टोकन लाने में त्रुटि:", err);
      return null;
    }
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      try {
        const [availableRes, myRes] = await Promise.allSettled([
          apiRequest("GET", "/api/delivery/orders/available"),
          apiRequest("GET", "/api/delivery/orders/my"),
        ]);
        const availableOrders =
          availableRes.status === "fulfilled" && Array.isArray((availableRes.value as any).orders)
            ? (availableRes.value as any).orders
            : [];
        const myOrders =
          myRes.status === "fulfilled" && Array.isArray((myRes.value as any).orders)
            ? (myRes.value as any).orders
            : [];
        const map = new Map();
        [...availableOrders, ...myOrders].forEach((o) => {
          if (o && typeof o.id === "number") {
            map.set(o.id, {
              ...o,
              isMine: Number(o.deliveryBoyId) === Number(user?.deliveryBoyId),
            });
          }
        });
        return Array.from(map.values());
      } catch (err) {
        console.error("ऑर्डर लाने में त्रुटि:", err);
        toast({
          title: "डेटा लाने में त्रुटि",
          description: "ऑर्डर लाते समय कोई समस्या आई",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: isAuthenticated && !!user,
  });

  useEffect(() => {
    if (!socket || !user) return;
    const onOrdersChanged = () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    if (socket.emit) socket.emit("register-client", { role: "delivery", userId: user.uid ?? user.id });
    if (socket.on) {
      socket.on("delivery:orders-changed", onOrdersChanged);
      socket.on("new-order", onOrdersChanged);
      socket.on("order:update", onOrdersChanged);
    }
    return () => {
      if (socket.off) {
        socket.off("delivery:orders-changed", onOrdersChanged);
        socket.off("new-order", onOrdersChanged);
        socket.off("order:update", onOrdersChanged);
      }
    };
  }, [socket, user, queryClient, isAuthenticated]);

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: number) => api.post("/api/delivery/accept", { orderId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: () => toast({ title: "त्रुटि", description: "ऑर्डर स्वीकार करने में विफल", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: number; newStatus: string }) =>
      api.patch(`/api/delivery/orders/${orderId}/status`, { newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: () => toast({ title: "त्रुटि", description: "ऑर्डर स्थिति अपडेट करने में विफल", variant: "destructive" }),
  });

  const handleOtpSubmitMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      const token = await getValidToken();
      if (!token) throw new Error("अमान्य या पुराना टोकन");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopnish-00ug.onrender.com";
      const response = await fetch(`${API_BASE}/api/delivery/orders/${orderId}/complete-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp }),
      });
      if (!response.ok) throw new Error("डिलीवरी पूरी करने में विफल");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      toast({ title: "डिलीवरी पूरी हुई", description: "ऑर्डर सफलतापूर्वक डिलीवर हो गया है।", variant: "success" });
      setOtpDialogOpen(false);
      setOtp("");
      setSelectedOrder(null);
    },
    onError: (error: any) =>
      toast({ title: "OTP त्रुटि", description: error.message || "OTP जमा करने में विफल।", variant: "destructive" }),
  });

  const handleStatusProgress = (order: any) => {
    const curStatus = order.status ?? "";
    if (curStatus === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(curStatus);
    if (next) updateStatusMutation.mutate({ orderId: order.id, newStatus: next });
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder || otp.trim().length !== 4) {
      toast({ title: "OTP दर्ज करें", description: "4-अंकों का OTP आवश्यक है।", variant: "destructive" });
      return;
    }
    handleOtpSubmitMutation.mutate({ orderId: selectedOrder.id, otp });
  };

  const handleLogout = () => auth?.signOut().then(() => window.location.reload());

  const myDeliveryBoyId = user?.deliveryBoyId;
  const { assignedOrders, availableOrders, completedOrders, totalOrdersCount, pendingCount, deliveredCount, outForDeliveryCount } =
    useMemo(() => {
      // ✅ FIX: Filter 'available' orders based on deliveryStatus === 'pending' AND status !== 'rejected'
      const available = orders.filter((o: any) =>
        (o.deliveryStatus ?? "").toLowerCase() === "pending" && (o.status ?? "").toLowerCase() !== "rejected"
      );
      
      // ✅ FIX: Filter 'assigned' orders based on deliveryStatus === 'accepted'
      const assigned = orders.filter((o: any) =>
        (o.deliveryStatus ?? "").toLowerCase() === "accepted"
      );

      // ✅ NEW: Filter completed orders for the new section
      const completed = orders.filter((o: any) =>
        (o.status ?? "").toLowerCase() === "delivered" && (o.deliveryStatus ?? "").toLowerCase() === "delivered"
      );

      const total = orders.length;
      const pending = available.length;
      const delivered = completed.length; // Use the new 'completed' array for this count
      const outForDelivery = orders.filter((o: any) => (o.status ?? "").toLowerCase() === "out_for_delivery").length;

      return {
        assignedOrders: assigned,
        availableOrders: available,
        completedOrders: completed,
        totalOrdersCount: total,
        pendingCount: pending,
        deliveredCount: delivered,
        outForDeliveryCount: outForDelivery,
      };
    }, [orders, myDeliveryBoyId]);

  if (isLoadingAuth || !isAuthenticated || !user || !socket || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500 mt-2">Connecting to server...</p>
      </div>
    );
  
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-800">
      <header className="bg-white shadow-sm border-b rounded-b-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">डिलीवरी डैशबोर्ड</h1>
              <p className="text-sm text-gray-600">फिर से स्वागत है, डिलीवरी बॉय!</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              लॉगआउट
            </Button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalOrdersCount}</p>
              <p className="text-sm text-gray-600">कुल ऑर्डर</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-gray-600">लंबित</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{deliveredCount}</p>
              <p className="text-sm text-gray-600">पूरे हुए</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Navigation className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{outForDeliveryCount}</p>
              <p className="text-sm text-gray-600">रास्ते में</p>
            </div>
          </CardContent>
        </Card>
      </section>
      
      {/* View Completed Orders Button */}
      <section className="max-w-6xl mx-auto px-4 pb-4">
        <Button onClick={() => setShowCompletedOrders(!showCompletedOrders)}>
          {showCompletedOrders ? "सक्रिय ऑर्डर दिखाएं" : "पूरे हुए ऑर्डर दिखाएं"}
        </Button>
      </section>

      {/* Orders List */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-10">
        {showCompletedOrders ? (
          // Completed Orders Section
          <div>
            <h2 className="text-2xl font-bold mb-4">पूरे हुए ऑर्डर</h2>
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">कोई पूरे हुए ऑर्डर नहीं</h3>
                  <p className="text-gray-600">अभी तक आपने कोई ऑर्डर डिलीवर नहीं किया है।</p>
                </CardContent>
              </Card>
            ) : (
              <DeliveryOrdersList
                orders={completedOrders}
                onAcceptOrder={(id) => acceptOrderMutation.mutate(id)}
                onUpdateStatus={(order) => handleStatusProgress(order)}
                acceptLoading={acceptOrderMutation.isPending}
                updateLoading={updateStatusMutation.isPending}
                Button={Button}
                Card={Card}
                CardContent={CardContent}
                CardHeader={CardHeader}
                CardTitle={CardTitle}
                Badge={Badge}
                statusColor={statusColor}
                statusText={statusText}
                nextStatus={nextStatus}
                nextStatusLabel={nextStatusLabel}
              />
            )}
          </div>
        ) : (
          <>
            {/* Available Orders Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">उपलब्ध ऑर्डर</h2>
              {availableOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">कोई उपलब्ध ऑर्डर नहीं</h3>
                    <p className="text-gray-600">नए ऑर्डर के लिए बाद में जाँच करें।</p>
                  </CardContent>
                </Card>
              ) : (
                <DeliveryOrdersList
                  orders={availableOrders}
                  onAcceptOrder={(id) => acceptOrderMutation.mutate(id)}
                  onUpdateStatus={(order) => handleStatusProgress(order)}
                  acceptLoading={acceptOrderMutation.isPending}
                  updateLoading={updateStatusMutation.isPending}
                  Button={Button}
                  Card={Card}
                  CardContent={CardContent}
                  CardHeader={CardHeader}
                  CardTitle={CardTitle}
                  Badge={Badge}
                  statusColor={statusColor}
                  statusText={statusText}
                  nextStatus={nextStatus}
                  nextStatusLabel={nextStatusLabel}
                />
              )}
            </div>

            {/* My Orders Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">मेरे ऑर्डर</h2>
              {assignedOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">कोई असाइन ऑर्डर नहीं</h3>
                    <p className="text-gray-600">आपको अभी तक कोई ऑर्डर असाइन नहीं किया गया है।</p>
                  </CardContent>
                </Card>
              ) : (
                <DeliveryOrdersList
                  orders={assignedOrders}
                  onAcceptOrder={(id) => acceptOrderMutation.mutate(id)}
                  onUpdateStatus={(order) => handleStatusProgress(order)}
                  acceptLoading={acceptOrderMutation.isPending}
                  updateLoading={updateStatusMutation.isPending}
                  Button={Button}
                  Card={Card}
                  CardContent={CardContent}
                  CardHeader={CardHeader}
                  CardTitle={CardTitle}
                  Badge={Badge}
                  statusColor={statusColor}
                  statusText={statusText}
                  nextStatus={nextStatus}
                  nextStatusLabel={nextStatusLabel}
                />
              )}
            </div>
          </>
        )}
      </section>

      {/* OTP Dialog */}
      {otpDialogOpen && selectedOrder && (
        <DeliveryOtpDialog
          isOpen={otpDialogOpen}
          onClose={() => {
            setOtpDialogOpen(false);
            setOtp("");
            setSelectedOrder(null);
          }}
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleOtpConfirmation}
          order={selectedOrder}
        />
      )}
    </div>
  );
      }
