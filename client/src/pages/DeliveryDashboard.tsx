// client/src/pages/DeliveryDashboard.tsx
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  User, LogOut, Package, Clock, CheckCircle, Navigation, Phone, MapPin, Loader2,
} from "lucide-react";

import DeliveryOtpDialog from "./DeliveryOtpDialog"; // सुनिश्चित करें कि DeliveryOtpDialog का पथ सही है
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient"; // ensure correct path
import api from "@/lib/api"; // ensure correct path
import { useSocket } from "@/hooks/useSocket"; // ensure correct path
import DeliveryOrdersList from "./DeliveryOrdersList"; // <-- DeliveryOrdersList कंपोनेंट को इम्पोर्ट करें

// UI Components (Mocks) - आप इन्हें @/components/ui से बदल सकते हैं
const useToast = () => {
  return {
    toast: ({ title, description, variant }: any) => {
      console.log(`Toast: ${title} - ${description} (Variant: ${variant})`);
    },
  };
};
const Button = ({ children, onClick, variant, size, disabled, ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md ${variant === "outline" ? "border" : "bg-blue-500 text-white"} ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    }`}
    {...props}
  >
    {children}
  </button>
);
const Card = ({ children }: any) => <div className="bg-white rounded-lg shadow-md p-4">{children}</div>;
const CardContent = ({ children, className = "" }: any) => <div className={`p-4 ${className}`}>{children}</div>;
const CardHeader = ({ children }: any) => <div className="p-4 border-b">{children}</div>;
const CardTitle = ({ children }: any) => <h2 className="text-xl font-bold">{children}</h2>;
const Badge = ({ children, className = "" }: any) => <span className={`px-2 py-1 text-xs rounded-full ${className}`}>{children}</span>;

// Status Helpers
const statusColor = (status: string) => {
  switch (status) {
    case "ready_for_pickup":
    case "pending":
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
      return "स्वीकृत";
    case "ready_for_pickup":
      return "पिकअप के लिए तैयार";
    case "picked_up":
      return "पिकअप हो गया";
    case "out_for_delivery":
      return "डिलीवरी के लिए निकला";
    case "delivered":
      return "डिलीवर हो गया";
    default:
      return status || "अज्ञात";
  }
};

const nextStatus = (status: string) => {
  switch (status) {
    case "accepted":
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
    case "accepted":
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopnish-lzrf.onrender.com";

export default function DeliveryDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, auth, isLoadingAuth, isAuthenticated } = useAuth();
  const socket = useSocket();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  const getValidToken = async () => {
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (err) {
      console.error("टोकन लाने में त्रुटि:", err);
      return null;
    }
  };

  if (isLoadingAuth || !isAuthenticated || !user || !socket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500 mt-2">Connecting to server...</p>
      </div>
    );
  }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/delivery/orders");
        return Array.isArray(res.orders) ? res.orders : [];
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

    const onOrdersChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    };

    socket.emit("register-client", { role: "delivery", userId: user.uid });
    socket.on("delivery:orders-changed", onOrdersChanged);
    socket.on("new-order", onOrdersChanged);

    return () => {
      socket.off("delivery:orders-changed", onOrdersChanged);
      socket.off("new-order", onOrdersChanged);
    };
  }, [socket, user, queryClient, isAuthenticated]);

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await api.post("/api/delivery/accept", { orderId });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: (error) => toast({ title: "त्रुटि", description: "ऑर्डर स्वीकार करने में विफल", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: string }) => {
      const response = await api.patch(`/api/delivery/orders/${orderId}/status`, {
        newStatus,
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
    onError: (error) => toast({ title: "त्रुटि", description: "ऑर्डर स्थिति अपडेट करने में विफल", variant: "destructive" }),
  });

  const handleOtpSubmitMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number, otp: string }) => {
      const token = await getValidToken();
      if (!token) throw new Error("अमान्य या पुराना टोकन");

      const response = await fetch(`${API_BASE}/api/delivery/orders/${orderId}/complete-delivery`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp }),
      });
      if (!response.ok) throw new Error("डिलीवरी पूरी करने में विफल");
      return response.json();
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
        toast({ title: "डिलीवरी पूरी हुई", description: "ऑर्डर सफलतापूर्वक डिलीवर हो गया है।", variant: "success" });
    },
    onError: (error: any) => {
        toast({ title: "OTP त्रुटि", description: error.message || "OTP जमा करने में विफल।", variant: "destructive" });
    },
  });

  const handleStatusProgress = (order: any) => {
    const cur = order.status;
    if (cur === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(cur);
    if (next) updateStatusMutation.mutate({ orderId: order.id, newStatus: next });
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({ title: "OTP दर्ज करें", description: "4-अंकों का OTP आवश्यक है।", variant: "destructive" });
      return;
    }
    handleOtpSubmitMutation.mutate({ orderId: selectedOrder.id, otp });
    setOtp("");
    setOtpDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleLogout = () => {
    if (!auth) return;
    auth.signOut().then(() => window.location.reload());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-sm text-gray-600">कुल ऑर्डर</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o: any) =>
                  ["ready_for_pickup", "picked_up", "out_for_delivery", "pending", "accepted"].includes(o.status)
                ).length}
              </p>
              <p className="text-sm text-gray-600">लंबित</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o: any) => o.status === "delivered").length}
              </p>
              <p className="text-sm text-gray-600">पूरे हुए</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Navigation className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o: any) => o.status === "out_for_delivery").length}
              </p>
              <p className="text-sm text-gray-600">रास्ते में</p>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-10">
        <div>
          <h2 className="text-2xl font-bold mb-4">उपलब्ध ऑर्डर</h2>
          {orders.filter((o: any) => !o.deliveryBoyId && o.status === "ready_for_pickup").length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">कोई उपलब्ध ऑर्डर नहीं</h3>
                <p className="text-gray-600">नए ऑर्डर के लिए बाद में जाँच करें।</p>
              </CardContent>
            </Card>
          ) : (
            <DeliveryOrdersList
              orders={orders.filter((o: any) => !o.deliveryBoyId && o.status === "ready_for_pickup")}
              onAcceptOrder={acceptOrderMutation.mutate}
              onUpdateStatus={handleStatusProgress}
              statusColor={statusColor}
              statusText={statusText}
              nextStatus={nextStatus}
              nextStatusLabel={nextStatusLabel}
              acceptLoading={acceptOrderMutation.isLoading}
              updateLoading={updateStatusMutation.isLoading}
              Button={Button} // UI कंपोनेंट्स को पास करें
              Card={Card}
              CardContent={CardContent}
              CardHeader={CardHeader}
              CardTitle={CardTitle}
              Badge={Badge}
            />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">मेरे ऑर्डर</h2>
          {orders.filter((o: any) => o.deliveryBoyId).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">कोई असाइन ऑर्डर नहीं</h3>
                <p className="text-gray-600">आपको अभी तक कोई ऑर्डर असाइन नहीं किया गया है।</p>
              </CardContent>
            </Card>
          ) : (
            <DeliveryOrdersList
              orders={orders.filter((o: any) => o.deliveryBoyId)}
              onAcceptOrder={acceptOrderMutation.mutate}
              onUpdateStatus={handleStatusProgress}
              statusColor={statusColor}
              statusText={statusText}
              nextStatus={nextStatus}
              nextStatusLabel={nextStatusLabel}
              acceptLoading={acceptOrderMutation.isLoading}
              updateLoading={updateStatusMutation.isLoading}
              Button={Button} // UI कंपोनेंट्स को पास करें
              Card={Card}
              CardContent={CardContent}
              CardHeader={CardHeader}
              CardTitle={CardTitle}
              Badge={Badge}
            />
          )}
        </div>
      </section>
      <DeliveryOtpDialog
        isOpen={otpDialogOpen}
        onOpenChange={setOtpDialogOpen}
        otp={otp}
        setOtp={setOtp}
        onConfirm={handleOtpConfirmation}
      />
    </div>
  );
}
