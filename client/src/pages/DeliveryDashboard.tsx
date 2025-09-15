// client/src/pages/deliverydashboard.tsx
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

// Helper components & hooks (assuming these are in separate files)
import DeliveryOtpDialog from "./DeliveryOtpDialog";
import DeliveryOrdersList from "./DeliveryOrdersList";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { apiRequest } from "@/lib/queryClient";
import api from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  useToast,
} from "@/components/ui"; // Assuming UI components are imported

// --- Constants and Helpers ---
// Moved helpers to the top for better organization.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopnish-lzrf.onrender.com";

const statusColor = (status: string) => {
  // ... (no changes needed)
};

const statusText = (status: string) => {
  // ... (no changes needed)
};

const nextStatus = (status: string) => {
  // ... (no changes needed)
};

const nextStatusLabel = (status: string) => {
  // ... (no changes needed)
};

// --- Main Component ---

export default function DeliveryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, auth, isLoadingAuth, isAuthenticated } = useAuth();
  const rawSocket = useSocket() as any;
  const socket = rawSocket?.socket ?? rawSocket;

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  // --- Data Fetching (useQuery) ---
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      try {
        // Fetch both available and assigned orders concurrently
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
        
        // De-duplicate orders using a Map to ensure each order ID is unique
        const orderMap = new Map<number, any>();
        for (const order of [...availableOrders, ...myOrders]) {
          if (order && typeof order.id === "number") {
            orderMap.set(order.id, order);
          }
        }
        return Array.from(orderMap.values());

      } catch (err) {
        console.error("Error fetching orders:", err);
        toast({
          title: "Data Fetching Error",
          description: "There was a problem fetching orders.",
          variant: "destructive",
        });
        return []; // Return an empty array on error
      }
    },
    enabled: isAuthenticated && !!user, // Only run the query if the user is authenticated
  });

  // --- WebSocket Effects ---
  useEffect(() => {
    if (!socket || !user) return;

    const onOrdersChanged = () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    
    socket.emit("register-client", { role: "delivery", userId: user.uid ?? user.id });
    socket.on("delivery:orders-changed", onOrdersChanged);
    socket.on("new-order", onOrdersChanged);
    socket.on("order:update", onOrdersChanged);

    return () => {
      socket.off("delivery:orders-changed", onOrdersChanged);
      socket.off("new-order", onOrdersChanged);
      socket.off("order:update", onOrdersChanged);
    };
  }, [socket, user, queryClient]);

  // --- API Mutations ---
  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: number) => api.post("/api/delivery/accept", { orderId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: () => toast({ title: "Error", description: "Failed to accept order", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: number; newStatus: string }) => 
      api.patch(`/api/delivery/orders/${orderId}/status`, { newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: () => toast({ title: "Error", description: "Failed to update order status", variant: "destructive" }),
  });

  const handleOtpSubmitMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      const token = await auth?.currentUser?.getIdToken(true);
      if (!token) throw new Error("Invalid or expired token");
      
      const response = await fetch(`${API_BASE}/api/delivery/orders/${orderId}/complete-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to complete delivery");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      toast({ title: "Delivery Complete", description: "Order has been successfully delivered.", variant: "success" });
      setOtpDialogOpen(false);
      setSelectedOrder(null);
      setOtp("");
    },
    onError: (error: any) =>
      toast({ title: "OTP Error", description: error.message || "Failed to submit OTP.", variant: "destructive" }),
  });

  // --- Event Handlers ---
  const handleStatusProgress = (order: any) => {
    const currentStatus = order.deliveryStatus ?? order.status ?? "";
    if (currentStatus === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(currentStatus);
    if (next) {
      updateStatusMutation.mutate({ orderId: order.id, newStatus: next });
    }
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({ title: "Invalid OTP", description: "A 4-digit OTP is required.", variant: "destructive" });
      return;
    }
    handleOtpSubmitMutation.mutate({ orderId: selectedOrder.id, otp });
  };
  
  const handleLogout = () => auth?.signOut().then(() => window.location.reload());

  // --- Derived State and Data Filtering ---
  // FIX: All variable definitions are moved before the return statement.
  // useMemo is used to prevent re-calculating these on every render unless 'orders' or 'user' changes.
  const {
    assignedOrders,
    availableOrders,
    totalOrdersCount,
    pendingCount,
    deliveredCount,
    outForDeliveryCount,
  } = useMemo(() => {
    const myDeliveryBoyId = user?.deliveryBoyId;

    const isAssignedToMe = (o: any) => Number(o.deliveryBoyId) === Number(myDeliveryBoyId);
    const isAvailableForPickup = (o: any) => (o.deliveryStatus ?? "").toLowerCase() === "pending";

    const assigned = orders.filter(isAssignedToMe);
    const available = orders.filter(isAvailableForPickup);
    
    const pending = orders.filter(o => ["pending", "accepted"].includes(o.deliveryStatus ?? "")).length;
    const delivered = orders.filter(o => o.deliveryStatus === "delivered").length;
    const outForDelivery = orders.filter(o => o.deliveryStatus === "out_for_delivery").length;

    return {
      assignedOrders: assigned,
      availableOrders: available,
      totalOrdersCount: orders.length,
      pendingCount: pending,
      deliveredCount: delivered,
      outForDeliveryCount: outForDelivery,
    };
  }, [orders, user?.deliveryBoyId]);


  // --- Loading and Auth States ---
  if (isLoadingAuth || !isAuthenticated || !user || !socket || isLoading) {
    const message = (isLoadingAuth || !user) ? "Authenticating..." : isLoading ? "Fetching orders..." : "Connecting to server...";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500 mt-2">{message}</p>
      </div>
    );
  }

  // --- JSX Rendering ---
  // FIX: There is now only one, clean return statement for the UI.
  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-800">
      <header className="bg-white shadow-sm border-b rounded-b-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            {/* Header Content */}
        </div>
      </header>

      {/* Summary Cards */}
      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card for Total Orders */}
        {/* Card for Pending */}
        {/* Card for Delivered */}
        {/* Card for Out for Delivery */}
      </section>

      {/* Orders Lists */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-10">
        {/* Available Orders Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Orders</h2>
          {availableOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                 <h3 className="text-lg font-medium">No Available Orders</h3>
              </CardContent>
            </Card>
          ) : (
            <DeliveryOrdersList
              orders={availableOrders}
              // ...props
            />
          )}
        </div>

        {/* My Orders Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">My Orders</h2>
          {assignedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="text-lg font-medium">No Assigned Orders</h3>
              </CardContent>
            </Card>
          ) : (
            <DeliveryOrdersList
              orders={assignedOrders}
              // ...props
            />
          )}
        </div>
      </section>

      {/* OTP Dialog */}
      {otpDialogOpen && selectedOrder && (
        <DeliveryOtpDialog
          isOpen={otpDialogOpen}
          onClose={() => setOtpDialogOpen(false)}
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleOtpConfirmation}
          order={selectedOrder}
          // ...props
        />
      )}
    </div>
  );
}
