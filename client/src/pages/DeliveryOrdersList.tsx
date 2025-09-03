// client/src/pages/delivery-dashboard/DeliveryOrdersList.tsx
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
// UI Components (जैसा पहले था)
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@/components/ui/ui-components";
import { Package, Clock, Navigation, CheckCircle, Phone, MapPin, User, LogOut } from "@/components/ui/icons";

// Helpers
const statusColor = (status: string) => {
  switch (status) {
    case "ready":
    case "pending": return "bg-yellow-500";
    case "picked_up": return "bg-blue-500";
    case "out_for_delivery": return "bg-purple-500";
    case "delivered": return "bg-green-500";
    default: return "bg-gray-500";
  }
};
const statusText = (status: string) => {
  switch (status) {
    case "ready":
    case "pending": return "पिकअप के लिए तैयार";
    case "picked_up": return "पिकअप किया गया";
    case "out_for_delivery": return "डिलीवरी के लिए निकला";
    case "delivered": return "डिलीवर किया गया";
    default: return status;
  }
};
const nextStatus = (status: string) => {
  switch (status) {
    case "ready":
    case "pending": return "picked_up";
    case "picked_up": return "out_for_delivery";
    case "out_for_delivery": return "delivered";
    default: return null;
  }
};
const nextStatusLabel = (status: string) => {
  switch (status) {
    case "ready":
    case "pending": return "पिकअप के रूप में चिह्नित करें";
    case "picked_up": return "डिलीवरी शुरू करें";
    case "out_for_delivery": return "डिलीवरी पूरी करें";
    default: return "";
  }
};

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  items: any[];
  deliveryAddress: any;
}

interface Props {
  userId: string;
  auth: any;
}

export default function DeliveryOrdersList({ userId, auth }: Props) {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  const toast = { toast: ({ title, description, variant }) => console.log(title, description, variant) };

  // ─── Fetch Orders ───
  React.useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/delivery/orders?deliveryBoyId=${userId}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [userId]);

  // ─── Mutations ───
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: any) => {
      const res = await fetch(`/api/delivery/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/delivery/orders`]);
    },
  });

  const handleOtpSubmit = useMutation({
    mutationFn: async ({ orderId, otp }: any) => {
      const res = await fetch(`/api/delivery/complete-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, otp }),
      });
      return res.json();
    },
    onSuccess: () => {
      setOtp("");
      setOtpDialogOpen(false);
      setSelectedOrder(null);
    },
  });

  const handleStatusProgress = (order: Order) => {
    if (order.status === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(order.status);
    if (next) updateStatusMutation.mutate({ orderId: order.id, status: next });
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder || otp.trim().length !== 4) return;
    handleOtpSubmit.mutate({ orderId: selectedOrder.id, otp });
  };

  const handleLogout = () => {
    auth.signOut().then(() => window.location.reload());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── JSX ───
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
              <LogOut className="w-4 h-4 mr-1" /> लॉगआउट
            </Button>
          </div>
        </div>
      </header>

      {/* Orders List */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ऑर्डर #{order.orderNumber}</CardTitle>
                  <Badge className={`ml-2 ${statusColor(order.status)} text-white`}>
                    {statusText(order.status)}
                  </Badge>
                </div>
                <div className="text-gray-600 font-medium">₹{order.total}</div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              <div>
                <strong>Items:</strong> {order.items.map((i) => i.name).join(", ")}
              </div>
              <div>
                <strong>Address:</strong> {order.deliveryAddress.address}, {order.deliveryAddress.city}
              </div>
              <Button
                className="mt-2"
                onClick={() => handleStatusProgress(order)}
                disabled={order.status === "delivered"}
              >
                {nextStatusLabel(order.status)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* OTP Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>डिलीवरी OTP दर्ज करें</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={4}
              placeholder="4 अंकों का OTP"
            />
            <Button onClick={handleOtpConfirmation} disabled={otp.length !== 4}>
              पुष्टि करें
            </Button>
            <Button variant="ghost" onClick={() => setOtpDialogOpen(false)}>
              बंद करें
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
