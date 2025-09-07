// client/src/pages/DeliveryOrdersList.tsx
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
// ## स्टेटस हेल्पर्स
// -----------------------------------------------------------------------------
const statusColor = (status: string) => {
  switch (status) {
    case "ready_for_pickup":
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
    case "ready_for_pickup":
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
      return "पिकअप किया गया";
    case "picked_up":
      return "डिलीवरी के लिए निकला";
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
  const { socket } = useSocket();

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://shopnish-lzrf.onrender.com";

  const getValidToken = async () => {
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (err) {
      console.error("Token fetch error:", err);
      return null;
    }
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      try {
        const token = await getValidToken();
        if (!token) throw new Error("अमान्य या समाप्त टोकन");
        const res = await fetch(`${API_BASE}/api/delivery/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("नेटवर्क प्रतिक्रिया ठीक नहीं थी");
        const data = await res.json();
        return Array.isArray(data.orders) ? data.orders : [];
      } catch (err) {
        console.error("ऑर्डर फ़ेच करने में त्रुटि:", err);
        toast({
          title: "डेटा फ़ेच करने में त्रुटि",
          description: "ऑर्डर लाने में समस्या हुई",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!userId,
  });

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

  const createMutationWithToken = (url: string, method = "PATCH") =>
    useMutation({
      mutationFn: async (body: any) => {
        const token = await getValidToken();
        if (!token) throw new Error("अमान्य या समाप्त टोकन");
        const response = await fetch(`${API_BASE}${url}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Mutation failed");
        return response.json();
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
      onError: (error) => console.error("Mutation error:", error),
    });

  const updateStatusMutation = createMutationWithToken("/api/delivery/update-status");
  const acceptOrderMutation = createMutationWithToken("/api/delivery/accept", "POST");
  const handleOtpSubmit = createMutationWithToken("/api/delivery/complete-delivery");

  const handleStatusProgress = (order: any) => {
    const cur = order.delivery_status || "pending";
    if (cur === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(cur);
    if (next) updateStatusMutation.mutate({ orderId: order.id, delivery_status: next });
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({ title: "OTP दर्ज करें", description: "4-अंकों का OTP आवश्यक है।", variant: "destructive" });
      return;
    }
    handleOtpSubmit.mutate({ orderId: selectedOrder.id, otp });
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
                {orders.filter((o: any) =>
                  ["ready_for_pickup", "picked_up", "out_for_delivery", "pending"].includes(o.delivery_status)
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
                {orders.filter((o: any) => o.delivery_status === "delivered").length}
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
                {orders.filter((o: any) => o.delivery_status === "out_for_delivery").length}
              </p>
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
          <>
            {orders.map((order: any) => {
              const addressData = order.deliveryAddress;
              const isAddressObject = typeof addressData === 'object' && addressData !== null;
              const sellerDetails = order.sellerDetails || order.items[0]?.product?.seller;
              const isSellerAddressObject = typeof sellerDetails === 'object' && sellerDetails !== null;
          
              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>ऑर्डर #{order.orderNumber}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} आइटम • ₹{order.total}
                        </p>
                      </div>
                      <Badge className={`${statusColor(order.delivery_status)} text-white`}>
                        {statusText(order.delivery_status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* ग्राहक विवरण */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">ग्राहक विवरण</h4>
                          <p className="font-medium">{isAddressObject ? addressData.fullName : "नाम अनुपलब्ध"}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{isAddressObject ? addressData.phone || "-" : "-"}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">डिलीवरी पता</h4>
                          <div className="flex items-start space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <div>
                              <p>{isAddressObject ? addressData.address : addressData}</p>
                              {isAddressObject && (
                                <p>
                                  {addressData.city || ""}{" "}
                                  {addressData.pincode ? `, ${addressData.pincode}` : ""}
                                </p>
                              )}
                              {isAddressObject && addressData.landmark && (
                                <p className="text-xs">लैंडमार्क: {addressData.landmark}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* विक्रेता विवरण */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">विक्रेता विवरण</h4>
                          <p className="font-medium">{isSellerAddressObject ? sellerDetails.name : "नाम अनुपलब्ध"}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{isSellerAddressObject ? sellerDetails.phone || "-" : "-"}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">पिकअप पता</h4>
                          <div className="flex items-start space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <div>
                              <p>{isSellerAddressObject ? sellerDetails.address : "पता अनुपलब्ध"}</p>
                              {isSellerAddressObject && (
                                <p>
                                  {sellerDetails.city || ""}{" "}
                                  {sellerDetails.pincode ? `, ${sellerDetails.pincode}` : ""}
                                </p>
                              )}
                              {isSellerAddressObject && sellerDetails.landmark && (
                                <p className="text-xs">लैंडमार्क: {sellerDetails.landmark}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ऑर्डर आइटम्स */}
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-medium mb-2">ऑर्डर आइटम्स</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-3 text-sm">
                            <img
                              src={item.product?.image || "https://placehold.co/32x32/E2E8F0/1A202C?text=No+Img"}
                              alt={item.product?.name || "No Name"}
                              className="w-8 h-8 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{item.product?.name || "उत्पाद डेटा अनुपलब्ध"}</p>
                              <p className="text-gray-600">
                                Qty: {item.quantity} {item.product?.unit}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                      {order.delivery_boy_id == null && order.status === 'ready_for_pickup' ? (
                        <Button
                          size="sm"
                          onClick={() => acceptOrderMutation.mutate({ orderId: order.id })}
                          disabled={acceptOrderMutation.isLoading}
                        >
                          ऑर्डर स्वीकार करें
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const query = encodeURIComponent(
                                `${isAddressObject ? addressData.address || "" : ""}, ${isAddressObject ? addressData.city || "" : ""}`
                              );
                              window.open(`https://www.google.com/maps?q=${query}`, "_blank");
                            }}
                          >
                            <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें (ग्राहक)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${isSellerAddressObject ? sellerDetails.phone || "" : ""}`)}
                          >
                            <Phone className="w-4 h-4 mr-2" /> विक्रेता को कॉल करें
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const query = encodeURIComponent(
                                `${isSellerAddressObject ? sellerDetails.address || "" : ""}, ${isSellerAddressObject ? sellerDetails.city || "" : ""}`
                              );
                              window.open(`https://www.google.com/maps?q=${query}`, "_blank");
                            }}
                          >
                            <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें (पिकअप)
                          </Button>
                          {nextStatus(order.delivery_status || order.status) && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusProgress(order)}
                              disabled={updateStatusMutation.isLoading}
                            >
                              {nextStatusLabel(order.delivery_status || order.status)}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </section>

      {/* OTP Dialog */}
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
