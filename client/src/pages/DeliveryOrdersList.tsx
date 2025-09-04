import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  User,
  LogOut,
  Package,
  Clock,
  CheckCircle,
  Navigation,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import DeliveryOtpDialog from "./DeliveryOtpDialog";
import { useSocket } from "@/hooks/useSocket";

// -----------------------------------------------------------------------------
// ## मॉक UI कंपोनेंट और यूटिलिटी फ़ंक्शन
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// ## कोर लॉजिक और हेल्पर्स
// -----------------------------------------------------------------------------
const statusColor = (status: string) => {
  switch (status) {
    case "ready":
    case "pending":
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
    case "ready":
    case "pending":
      return "पिकअप के लिए तैयार";
    case "picked_up":
      return "पिकअप किया गया";
    case "out_for_delivery":
      return "डिलीवरी के लिए निकला";
    case "delivered":
      return "डिलीवर किया गया";
    default:
      return status;
  }
};
const nextStatus = (status: string) => {
  switch (status) {
    case "ready":
    case "pending":
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
    case "ready":
    case "pending":
      return "पिकअप के रूप में चिह्नित करें";
    case "picked_up":
      return "डिलीवरी शुरू करें";
    case "out_for_delivery":
      return "डिलीवरी पूरी करें";
    default:
      return "";
  }
};

// -----------------------------------------------------------------------------
// ## मुख्य React कंपोनेंट: DeliveryOrdersList
// -----------------------------------------------------------------------------
export default function DeliveryOrdersList({ userId, auth }: { userId: string | null; auth: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  // API base
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopnish-lzrf.onrender.com";

  // ─── useQuery: ऑर्डर्स फ़ेच करने के लिए
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["deliveryOrders", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const token = auth ? await auth.currentUser?.getIdToken() : null;
        const res = await fetch(`${API_BASE}/api/delivery/orders?deliveryBoyId=${encodeURIComponent(userId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("नेटवर्क प्रतिक्रिया ठीक नहीं थी");
        const data = await res.json();
        return Array.isArray(data.orders) ? data.orders : [];
      } catch (err) {
        console.error("ऑर्डर फ़ेच करने में त्रुटि:", err);
        toast({ title: "डेटा फ़ेच करने में त्रुटि", description: "ऑर्डर लाने में समस्या हुई", variant: "destructive" });
        return [];
      }
    },
    enabled: !!userId, // ✅ जब तक userId नहीं है तब तक query न चलाएं
    refetchInterval: 60000, // 60 सेकंड बाद ऑटोमेटिकली refetch करें (सिर्फ़ एक fallback)
    staleTime: 60000,
  });

  // ─── Socket.IO: listen to server events and invalidate queries
  useEffect(() => {
    if (!socket || !userId) return;

    const onOrdersChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    };

    socket.on("delivery:orders-changed", onOrdersChanged);
    socket.on("new-order", onOrdersChanged);
    socket.on("connect", () => {
      socket.emit("register-client", { role: "delivery", userId });
    });

    return () => {
      socket.off("delivery:orders-changed", onOrdersChanged);
      socket.off("new-order", onOrdersChanged);
    };
  }, [socket, userId, queryClient]);

  // ─── Mutations ───
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const response = await fetch(`${API_BASE}/api/delivery/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status }),
      });
      if (!response.ok) throw new Error("स्टेटस अपडेट करने में विफल");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      toast({ title: "स्टेटस अपडेट किया गया", description: "ऑर्डर का स्टेटस सफलतापूर्वक अपडेट किया गया।" });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast({ title: "स्टेटस अपडेट करने में त्रुटि", description: "कृपया पुनः प्रयास करें।", variant: "destructive" });
    },
  });

  const handleOtpSubmit = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const response = await fetch(`${API_BASE}/api/delivery/complete-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, otp }),
      });
      if (!response.ok) throw new Error("OTP सबमिशन विफल");
      return response.json();
    },
    onSuccess: () => {
      setOtp("");
      setOtpDialogOpen(false);
      setSelectedOrder(null);
      toast({ title: "डिलीवरी पूरी हुई", description: "ऑर्डर को सफलतापूर्वक डिलीवर किया गया।" });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    },
    onError: (error) => {
      console.error("OTP submission failed:", error);
      toast({ title: "गलत OTP", description: "कृपया OTP जांचें और फिर से प्रयास करें।", variant: "destructive" });
    },
  });

  // ─── Handlers ───
  const handleStatusProgress = (order: any) => {
    const cur = order.deliveryStatus || order.status || "pending";
    if (cur === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(cur);
    if (next) updateStatusMutation.mutate({ orderId: order.id, status: next });
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({ title: "OTP दर्ज करें", description: "4-अंकों का OTP आवश्यक है।", variant: "destructive" });
      return;
    }
    handleOtpSubmit.mutate({ orderId: selectedOrder.id, otp });
  };

  const handleLogout = () => {
    if (!auth) return;
    auth.signOut().then(() => window.location.reload());
  };

  // -----------------------------------------------------------------------------
  // ## JSX रेंडरिंग
  // -----------------------------------------------------------------------------
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
              <p className="text-sm text-gray-600">वापस स्वागत है, डिलीवरी बॉय!</p>
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

      {/* Metrics */}
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
                {
                  orders.filter((o: any) =>
                    ["ready", "picked_up", "out_for_delivery", "pending"].includes(o.deliveryStatus || o.status)
                  ).length
                }
              </p>
              <p className="text-sm text-gray-600">लंबित</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{orders.filter((o: any) => (o.deliveryStatus || o.status) === "delivered").length}</p>
              <p className="text-sm text-gray-600">पूरे हुए</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Navigation className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{orders.filter((o: any) => (o.deliveryStatus || o.status) === "out_for_delivery").length}</p>
              <p className="text-sm text-gray-600">रास्ते में</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Orders list */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
        <h2 className="text-2xl font-bold">असाइन / उपलब्ध ऑर्डर</h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">कोई ऑर्डर उपलब्ध नहीं</h3>
              <p className="text-gray-600">नए ऑर्डर के लिए बाद में देखें।</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order: any) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ऑर्डर #{order.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {order.items?.length || 0} आइटम • ₹{order.total}
                    </p>
                  </div>
                  <Badge className={`${statusColor(order.deliveryStatus || order.status)} text-white`}>
                    {statusText(order.deliveryStatus || order.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">ग्राहक विवरण</h4>
                      <p className="font-medium">{order.deliveryAddress?.fullName || order.deliveryAddress}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{order.deliveryAddress?.phone || "-"}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">डिलीवरी पता</h4>
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <div>
                          <p>{order.deliveryAddress?.address || order.deliveryAddress}</p>
                          <p>{order.deliveryAddress?.city || ""} {order.deliveryAddress?.pincode ? `, ${order.deliveryAddress.pincode}` : ""}</p>
                          {order.deliveryAddress?.landmark && <p className="text-xs">लैंडमार्क: {order.deliveryAddress.landmark}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">ऑर्डर आइटम्स</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-3 text-sm">
                          <img src={item.product?.image} alt={item.product?.name} className="w-8 h-8 object-cover rounded" />
                          <div className="flex-1">
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-gray-600">Qty: {item.quantity} {item.product?.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => window.open(`tel:${order.deliveryAddress?.phone || ""}`)}>
                    <Phone className="w-4 h-4 mr-2" /> ग्राहक को कॉल करें
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(`${order.deliveryAddress?.address || ""}, ${order.deliveryAddress?.city || ""}`)}`)}>
                    <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें
                  </Button>

                  {nextStatus(order.deliveryStatus || order.status) && (
                    <Button size="sm" onClick={() => handleStatusProgress(order)} disabled={updateStatusMutation.isLoading}>
                      {nextStatusLabel(order.deliveryStatus || order.status)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <DeliveryOtpDialog
        selectedOrder={selectedOrder}
        otp={otp}
        setOtp={setOtp}
        otpDialogOpen={otpDialogOpen}
        setOtpDialogOpen={setOtpDialogOpen}
        handleOtpConfirmation={handleOtpConfirmation}
        isSubmitting={handleOtpSubmit.isLoading}
      />
    </div>
  );
}
