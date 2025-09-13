// client/src/pages/seller/OrderManager.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { OrderWithItems, Seller, orderStatusEnum } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import { useEffect } from "react";

interface OrderWithDeliveryBoy extends OrderWithItems {
  deliveryBoy?: {
    id: number;
    name: string;
  };
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending": return "secondary";
    case "accepted": return "info";
    case "preparing": return "warning";
    case "ready_for_pickup": return "info";
    case "picked_up": return "info";
    case "out_for_delivery": return "warning";
    case "delivered": return "success";
    case "cancelled":
    case "rejected": return "destructive";
    default: return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "pending": return "लंबित";
    case "accepted": return "स्वीकृत";
    case "preparing": return "तैयार हो रहा है";
    case "ready_for_pickup": return "पिकअप के लिए तैयार";
    case "picked_up": return "पिकअप किया गया";
    case "out_for_delivery": return "डिलीवरी के लिए निकला";
    case "delivered": return "डिलीवर किया गया";
    case "cancelled": return "रद्द कर दिया गया";
    case "rejected": return "अस्वीकृत";
    default: return "अज्ञात";
  }
};

export default function OrderManager({
  orders,
  isLoading,
  error,
  seller,
}: OrderManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { socket } = useSocket(); // ✅ destructure from object

  // ---------------- SOCKET.IO LISTENERS ----------------
  useEffect(() => {
  if (!socket || !seller) return;

  // ---------------- Order Status Update ----------------
  const handleOrderUpdate = (updatedOrder: OrderWithItems) => {
    queryClient.setQueryData<OrderWithItems[]>(["/api/sellers/orders"], (old) =>
      old ? old.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)) : [updatedOrder]
    );

    toast({
      title: "Order Updated",
      description: `Order #${updatedOrder.id} → ${getStatusText(updatedOrder.status)}`,
    });
  };

  // ---------------- New Order ----------------
  const handleNewOrderForSeller = (newOrder: OrderWithDeliveryBoy) => {
    queryClient.setQueryData<OrderWithDeliveryBoy[]>(["/api/sellers/orders"], (old) =>
      old ? [newOrder, ...old] : [newOrder]
    );

    toast({
      title: "New Order Received",
      description: `Order #${newOrder.id} आया है।`,
    });
  };

  // Event Listeners
  socket.on("order:status-updated", handleOrderUpdate);
  socket.on("new-order-for-seller", handleNewOrderForSeller);

  return () => {
    socket.off("order:status-updated", handleOrderUpdate);
    socket.off("new-order-for-seller", handleNewOrderForSeller);
  };
}, [socket, seller, queryClient, toast]);

  // ---------------- MUTATION (STATUS UPDATE) ----------------
  const { mutate, isPending } = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: string }) => {
      if (!(orderStatusEnum.enumValues as unknown as string[]).includes(newStatus)) {
        throw new Error("Invalid order status provided.");
      }
      return await apiRequest("PATCH", `/api/sellers/orders/${orderId}/status`, { newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/orders"] });
      toast({
        title: "Order Status Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    mutate({ orderId, newStatus });
  };

  // ---------------- RENDER HELPERS ----------------
  const renderStatusActions = (order: OrderWithItems) => {
    switch (order.status) {
      case "pending":
      case "placed":
        return (
          <>
            <Button variant="success" onClick={() => handleStatusUpdate(order.id, "accepted")} disabled={isPending}>
              स्वीकार करें
            </Button>
            <Button variant="destructive" onClick={() => handleStatusUpdate(order.id, "rejected")} disabled={isPending}>
              अस्वीकार करें
            </Button>
          </>
        );
      case "accepted":
        return (
          <Button onClick={() => handleStatusUpdate(order.id, "preparing")} disabled={isPending}>
            तैयार करना शुरू करें
          </Button>
        );
      case "preparing":
        return (
          <Button onClick={() => handleStatusUpdate(order.id, "ready_for_pickup")} disabled={isPending}>
            पिकअप के लिए तैयार
          </Button>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (isLoading) return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );

    if (error) return <p className="text-red-500">ऑर्डर लोड करने में त्रुटि: {error.message}</p>;
    if (!orders || orders.length === 0) return <p className="text-muted-foreground">अभी कोई ऑर्डर नहीं है।</p>;

    return (
      <div className="space-y-4">
        {orders.map((order: OrderWithDeliveryBoy) => (
          <div key={order.id} className="border rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
              <h2 className="font-bold text-lg">ऑर्डर #{order.orderNumber || order.id}</h2>
              <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <Badge variant={getStatusBadgeVariant(order.status as string)}>
                  {getStatusText(order.status)}
                </Badge>
              </div>
            </div>

            {order.customer && order.deliveryAddress && (
              <p className="text-sm">ग्राहक: <strong>{order.customer.firstName || order.deliveryAddress.fullName || "अज्ञात"}</strong></p>
            )}

            {order.deliveryBoy && (
              <p className="text-sm text-muted-foreground mt-1">डिलीवरी बॉय: <strong>{order.deliveryBoy.name}</strong></p>
            )}

            <p className="text-sm text-muted-foreground">भुगतान: <strong>{order.paymentMethod || "लागू नहीं"}</strong> ({order.paymentStatus || "लंबित"})</p>
            <p className="text-sm text-muted-foreground">कुल: <strong>₹{Number(order.total ?? 0).toLocaleString()}</strong></p>
            <p className="text-sm text-muted-foreground">ऑर्डर किया गया: {new Date(order.createdAt).toLocaleString()}</p>

            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <img src={item.product?.image || "/placeholder.png"} alt={item.product?.name || item.name || "Product"} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <p className="font-semibold">{item.product?.name || item.name || "अनाम उत्पाद"}</p>
                    <p className="text-sm text-gray-500">मात्रा: {item.quantity} × ₹{Number(item.unitPrice ?? item.product?.price ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex mt-6 space-x-2">{renderStatusActions(order)}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>आपके ऑर्डर्स</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
