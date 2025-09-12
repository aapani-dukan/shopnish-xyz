import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, getValidToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";

interface DeliveryOrder {
  id: number;
  customerName: string;
  address: string;
  status: string;
  otp?: string;
}

export default function DeliveryDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket(); // ✅ FIX: destructure isConnected also
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});

  // Fetch orders
  const { data: orders, isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      const response = await api.get("/api/delivery/orders");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Socket events
  useEffect(() => {
    if (!socket || !user || !isConnected) return;

    const onOrdersChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    };

    // ✅ only emit if socket connected
    socket.emit("register-client", { role: "delivery", userId: user.uid });

    socket.on("delivery:orders-changed", onOrdersChanged);
    socket.on("new-order", onOrdersChanged);

    return () => {
      socket.off("delivery:orders-changed", onOrdersChanged);
      socket.off("new-order", onOrdersChanged);
    };
  }, [socket, user, isConnected, queryClient, isAuthenticated]);

  // Accept order
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await api.post("/api/delivery/accept", { orderId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    },
    onError: () =>
      toast({ title: "त्रुटि", description: "ऑर्डर स्वीकार करने में विफल", variant: "destructive" }),
  });

  // Update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: string }) => {
      const response = await api.patch(`/api/delivery/orders/${orderId}/status`, {
        newStatus,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    },
    onError: () =>
      toast({ title: "त्रुटि", description: "ऑर्डर स्थिति अपडेट करने में विफल", variant: "destructive" }),
  });

  // OTP verification
  const handleOtpSubmitMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      const token = await getValidToken();
      if (!token) throw new Error("अमान्य या पुराना टोकन");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/delivery/orders/${orderId}/complete-delivery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otp }),
        }
      );
      if (!response.ok) throw new Error("डिलीवरी पूरी करने में विफल");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      toast({
        title: "डिलीवरी पूरी हुई",
        description: "ऑर्डर सफलतापूर्वक डिलीवर हो गया है।",
        variant: "success",
      });
    },
    onError: (error: any) =>
      toast({
        title: "OTP त्रुटि",
        description: error.message || "OTP जमा करने में विफल।",
        variant: "destructive",
      }),
  });

  // OTP input state
  const handleOtpChange = (orderId: number, otp: string) => {
    setOtpInputs((prev) => ({ ...prev, [orderId]: otp }));
  };

  const handleOtpSubmit = (orderId: number) => {
    const otp = otpInputs[orderId];
    if (!otp) {
      toast({ title: "त्रुटि", description: "कृपया OTP दर्ज करें", variant: "destructive" });
      return;
    }
    handleOtpSubmitMutation.mutate({ orderId, otp });
  };

  if (isLoading) return <p>लोड हो रहा है...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">डिलीवरी डैशबोर्ड</h1>
      {orders && orders.length > 0 ? (
        orders.map((order) => (
          <Card key={order.id} className="shadow-md">
            <CardHeader>
              <CardTitle>ऑर्डर #{order.id}</CardTitle>
              <Badge>{order.status}</Badge>
            </CardHeader>
            <CardContent>
              <p>
                <strong>ग्राहक:</strong> {order.customerName}
              </p>
              <p>
                <strong>पता:</strong> {order.address}
              </p>

              {order.status === "pending" && (
                <Button
                  className="mt-4"
                  onClick={() => acceptOrderMutation.mutate(order.id)}
                  disabled={acceptOrderMutation.isPending}
                >
                  ऑर्डर स्वीकार करें
                </Button>
              )}

              {order.status === "accepted" && (
                <Button
                  className="mt-4"
                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: "out_for_delivery" })}
                  disabled={updateStatusMutation.isPending}
                >
                  डिलीवरी शुरू करें
                </Button>
              )}

              {order.status === "out_for_delivery" && (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    placeholder="OTP दर्ज करें"
                    value={otpInputs[order.id] || ""}
                    onChange={(e) => handleOtpChange(order.id, e.target.value)}
                    className="border p-2 rounded w-full"
                  />
                  <Button
                    onClick={() => handleOtpSubmit(order.id)}
                    disabled={handleOtpSubmitMutation.isPending}
                  >
                    OTP सत्यापित करें और डिलीवरी पूरी करें
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <p>कोई ऑर्डर उपलब्ध नहीं है।</p>
      )}
    </div>
  );
}
