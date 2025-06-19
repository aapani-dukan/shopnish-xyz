

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";           // ⬅️ react-router v6
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@/components/ui/dialog";

import {
  Package,
  Navigation,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface DeliveryOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  total: string;
  paymentMethod: string;
  status: "ready" | "picked_up" | "out_for_delivery" | "delivered";
  estimatedDeliveryTime: string;
  deliveryOtp: string;
  items: Array<{
    id: number;
    quantity: number;
    product: {
      name: string;
      nameHindi: string;
      image: string;
      unit: string;
    };
  }>;
}

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

const statusColor = (status: DeliveryOrder["status"]) => {
  switch (status) {
    case "ready":
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

const statusText = (status: DeliveryOrder["status"]) => {
  switch (status) {
    case "ready":
      return "Ready for Pickup";
    case "picked_up":
      return "Picked Up";
    case "out_for_delivery":
      return "Out for Delivery";
    case "delivered":
      return "Delivered";
    default:
      return status;
  }
};

const nextStatus = (status: DeliveryOrder["status"]) => {
  switch (status) {
    case "ready":
      return "picked_up";
    case "picked_up":
      return "out_for_delivery";
    case "out_for_delivery":
      return "delivered";
    default:
      return null;
  }
};

const nextStatusLabel = (status: DeliveryOrder["status"]) => {
  switch (status) {
    case "ready":
      return "Mark as Picked Up";
    case "picked_up":
      return "Start Delivery";
    case "out_for_delivery":
      return "Complete Delivery";
    default:
      return "";
  }
};

/* -------------------------------------------------------------------------- */
/*                             Component Start                                */
/* -------------------------------------------------------------------------- */

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ---------------------------- local state -------------------------------- */
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  /* ---------------------- auth & initial redirect -------------------------- */
  const deliveryBoyId = localStorage.getItem("deliveryBoyId");
  const deliveryBoyName = "Ravi Singh"; // demo

  useEffect(() => {
    if (!localStorage.getItem("deliveryBoyToken")) {
      navigate("/delivery-login");
    }
  }, [navigate]);

  /* ---------------------------- react-query -------------------------------- */

  const { data: orders = [], isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: ["/api/delivery/orders", deliveryBoyId],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/delivery/orders?deliveryBoyId=${encodeURIComponent(
          deliveryBoyId ?? ""
        )}`
      ).then((r) => r.json()),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: number;
      status: string;
    }) => apiRequest("PATCH", `/api/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      toast({
        title: "Status Updated",
        description: "Order status updated successfully.",
      });
    },
  });

  const completeDelivery = useMutation({
    mutationFn: ({
      orderId,
      otp,
    }: {
      orderId: number;
      otp: string;
    }) =>
      apiRequest("POST", `/api/orders/${orderId}/complete-delivery`, {
        otp,
        deliveryBoyId,
      }),
    onSuccess: () => {
      setOtp("");
      setOtpDialogOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      toast({
        title: "Delivery Completed",
        description: "Order marked as delivered.",
      });
    },
    onError: () => {
      toast({
        title: "Invalid OTP",
        description: "Please check the OTP and try again.",
        variant: "destructive",
      });
    },
  });

  /* ----------------------------- handlers ---------------------------------- */

  const handleLogout = () => {
    localStorage.removeItem("deliveryBoyToken");
    localStorage.removeItem("deliveryBoyId");
    navigate("/delivery-login");
  };

  const handleAdminLogin = () => navigate("/admin-dashboard");

  const handleStatusProgress = (order: DeliveryOrder) => {
    if (order.status === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(order.status);
    if (next) {
      updateStatus.mutate({ orderId: order.id, status: next });
    }
  };

  const handleOtpSubmit = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({
        title: "Enter OTP",
        description: "4-digit OTP required.",
        variant: "destructive",
      });
      return;
    }
    completeDelivery.mutate({ orderId: selectedOrder.id, otp });
  };

  /* ----------------------------- loading ----------------------------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ----------------------------- JSX --------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* left */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Delivery Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {deliveryBoyName}
              </p>
            </div>
          </div>
          {/* right */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleAdminLogin}>
              <ShieldCheck className="w-4 h-4 mr-1" />
              Admin Login
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">
                {
                  orders.filter((o) =>
                    ["ready", "picked_up", "out_for_delivery"].includes(o.status)
                  ).length
                }
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o) => o.status === "delivered").length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Navigation className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o) => o.status === "out_for_delivery").length}
              </p>
              <p className="text-sm text-gray-600">On Route</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Orders List ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
        <h2 className="text-2xl font-bold">Assigned Orders</h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders assigned</h3>
              <p className="text-gray-600">
                Check back later for new delivery assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order #{order.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {order.items.length} items • ₹{order.total}
                    </p>
                  </div>
                  <Badge className={`${statusColor(order.status)} text-white`}>
                    {statusText(order.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {/* --- order details grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer & address */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Customer Details</h4>
                      <p className="font-medium">
                        {order.deliveryAddress.fullName}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{order.deliveryAddress.phone}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Delivery Address</h4>
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <div>
                          <p>{order.deliveryAddress.address}</p>
                          <p>
                            {order.deliveryAddress.city},{" "}
                            {order.deliveryAddress.pincode}
                          </p>
                          {order.deliveryAddress.landmark && (
                            <p className="text-xs">
                              Landmark: {order.deliveryAddress.landmark}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-2">Order Items</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-3 text-sm"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-gray-600">
                              Qty: {item.quantity} {item.product.unit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`tel:${order.deliveryAddress.phone}`)
                    }
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Customer
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          `${order.deliveryAddress.address}, ${order.deliveryAddress.city}`
                        )}`
                      )
                    }
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Navigate
                  </Button>

                  {nextStatus(order.status) && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusProgress(order)}
                      disabled={updateStatus.isPending}
                    >
                      {nextStatusLabel(order.status)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* ─── OTP Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600 mb-4">
            Ask the customer for the 4-digit OTP to confirm delivery.
          </p>

          {selectedOrder && (
            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <p className="font-medium">
                Order #{selectedOrder.orderNumber}
              </p>
              <p className="text-sm text-gray-600">
                {selectedOrder.deliveryAddress.fullName}
              </p>
              <p className="text-sm text-gray-600">
                Total: ₹{selectedOrder.total}
              </p>
            </div>
          )}

          <div className="mb-4">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleOtpSubmit}
              disabled={
                completeDelivery.isPending || otp.trim().length !== 4
              }
              className="flex-1"
            >
              {completeDelivery.isPending ? "Verifying…" : "Confirm"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOtpDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
    }
