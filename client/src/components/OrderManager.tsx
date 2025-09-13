// client/src/pages/seller/ordermanager.tsx

import React, { useEffect } from "react"; // ✅ ठीक किया गया नामकरण
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Badge } from "@/components/ui/badge"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Button } from "@/components/ui/button"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Skeleton } from "@/components/ui/skeleton"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useQueryClient, useMutation } from "@tanstack/react-query"; // ✅ ठीक किया गया नामकरण
import { OrderWithItems, Seller, OrderStatusEnum } from "shared/backend/schema"; // ✅ ठीक किया गया नामकरण
import { apiRequest } from "@/lib/queryClient"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useToast } from "@/hooks/use-toast"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useSocket } from "@/providers/SocketProvider"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ

// ✅ props इंटरफ़ेस
interface OrderManagerProps { // ✅ ठीक किया गया नामकरण
  orders: OrderWithItems[] | undefined; // ✅ ठीक किया गया नामकरण
  isLoading: boolean; // ✅ ठीक किया गया नामकरण
  error: Error | null; // ✅ ठीक किया गया नामकरण
  seller: Seller; // ✅ ठीक किया गया नामकरण
}

// ✅ नया इंटरफ़ेस जो deliveryboy को शामिल करता है
interface OrderWithDeliveryBoy extends OrderWithItems { // ✅ ठीक किया गया नामकरण
  deliveryboy?: {
    id: number;
    name: string;
  };
}

const getStatusBadgeVariant = (status: string) => { // ✅ ठीक किया गया नामकरण
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
      return "info";
    case "preparing":
      return "warning";
    case "ready_for_pickup":
      return "info";
    case "picked_up":
      return "info";
    case "out_for_delivery":
      return "warning";
    case "delivered":
      return "success";
    case "cancelled":
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusText = (status: string) => { // ✅ ठीक किया गया नामकरण
  switch (status) {
    case "pending":
      return "लंबित";
    case "accepted":
      return "स्वीकृत";
    case "preparing":
      return "तैयार हो रहा है";
    case "ready_for_pickup":
      return "पिकअप के लिए तैयार";
    case "picked_up":
      return "पिकअप किया गया";
    case "out_for_delivery":
      return "डिलीवरी के लिए निकला";
    case "delivered":
      return "डिलीवर किया गया";
    case "cancelled":
      return "रद्द कर दिया गया";
    case "rejected":
      return "अस्वीकृत";
    default:
      return "अज्ञात";
  }
};

export default function OrderManager({ // ✅ ठीक किया गया नामकरण
  orders,
  isLoading,
  error,
  seller,
}: OrderManagerProps) { // ✅ ठीक किया गया नामकरण
  const queryClient = useQueryClient(); // ✅ ठीक किया गया नामकरण
  const { toast } = useToast(); // ✅ ठीक किया गया नामकरण
  
  // ✅ useSocket से `socket` को सही तरीके से डी-स्ट्रक्चर करें
  const { socket } = useSocket(); 

  // ---------------- socket.io listeners ----------------
  useEffect(() => { // ✅ ठीक किया गया नामकरण
    if (!socket || !seller) return; // ✅ null-check

    const handleOrderUpdate = (updatedOrder: OrderWithItems) => { // ✅ ठीक किया गया नामकरण
      console.log("📦 Order status updated:", updatedOrder);

      // ✅ React Query cache को सीधे अपडेट करो
      queryClient.setQueryData<OrderWithItems[]>(["/api/sellers/orders"], (old) => { // ✅ ठीक किया गया नामकरण
        if (!old) return [updatedOrder];
        return old.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      });

      toast({
        title: "Order Updated", // ✅ ठीक किया गया नामकरण
        description: `Order #${updatedOrder.id} → ${getStatusText(updatedOrder.status)}`, // ✅ ठीक किया गया नामकरण
      });
    };

    socket.on("order:status-updated", handleOrderUpdate); // ✅ ठीक किया गया नामकरण

    return () => {
      socket.off("order:status-updated", handleOrderUpdate); // ✅ cleanup में specific handler को पास करें
    };
  }, [socket, seller, queryClient, toast]); // ✅ ठीक किया गया नामकरण

  // ---------------- mutation (status update) ----------------
  const { mutate, isPending } = useMutation({ // ✅ ठीक किया गया नामकरण
    mutationFn: async ({ // ✅ ठीक किया गया नामकरण
      orderId, // ✅ ठीक किया गया नामकरण
      newStatus, // ✅ ठीक किया गया नामकरण
    }: {
      orderId: number; // ✅ ठीक किया गया नामकरण
      newStatus: string; // ✅ ठीक किया गया नामकरण
    }) => {
      // ✅ OrderStatusEnum से enum values को सही तरीके से एक्सेस करें
      if (!(Object.values(OrderStatusEnum) as string[]).includes(newStatus)) {
        throw new Error("Invalid order status provided."); // ✅ ठीक किया गया `Error`
      }

      const response = await apiRequest( // ✅ ठीक किया गया नामकरण
        "PATCH", // ✅ HTTP method को कैपिटल में लिखें
        `/api/sellers/orders/${orderId}/status`, // ✅ ठीक किया गया नामकरण
        { newStatus } // ✅ ठीक किया गया नामकरण
      );
      return response;
    },
    onSuccess: () => { // ✅ ठीक किया गया नामकरण
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/orders"] }); // ✅ ठीक किया गया नामकरण
      toast({
        title: "Order Status Updated", // ✅ ठीक किया गया नामकरण
        description: "Order status has been updated successfully.",
      });
    },
    onError: (err: any) => { // ✅ ठीक किया गया नामकरण
      toast({
        title: "Error", // ✅ ठीक किया गया नामकरण
        description: err.message || "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (orderId: number, newStatus: string) => { // ✅ ठीक किया गया नामकरण
    mutate({ orderId, newStatus }); // ✅ ठीक किया गया नामकरण
  };

  // ---------------- render helpers ----------------
  const renderStatusActions = (order: OrderWithItems) => { // ✅ ठीक किया गया नामकरण
    switch (order.status) {
      case "pending":
      case "placed":
        return (
          <>
            <Button // ✅ ठीक किया गया नामकरण
              variant="success"
              onClick={() => handleStatusUpdate(order.id, "accepted")} // ✅ ठीक किया गया नामकरण
              disabled={isPending} // ✅ ठीक किया गया नामकरण
            >
              स्वीकार करें
            </Button>
            <Button // ✅ ठीक किया गया नामकरण
              variant="destructive"
              onClick={() => handleStatusUpdate(order.id, "rejected")} // ✅ ठीक किया गया नामकरण
              disabled={isPending} // ✅ ठीक किया गया नामकरण
            >
              अस्वीकार करें
            </Button>
          </>
        );
      case "accepted":
        return (
          <Button // ✅ ठीक किया गया नामकरण
            onClick={() => handleStatusUpdate(order.id, "preparing")} // ✅ ठीक किया गया नामकरण
            disabled={isPending} // ✅ ठीक किया गया नामकरण
          >
            तैयार करना शुरू करें
          </Button>
        );
      case "preparing":
        return (
          <Button // ✅ ठीक किया गया नामकरण
            onClick={() => handleStatusUpdate(order.id, "ready_for_pickup")} // ✅ ठीक किया गया नामकरण
            disabled={isPending} // ✅ ठीक किया गया नामकरण
          >
            पिकअप के लिए तैयार
          </Button>
        );
      default:
        return null;
    }
  };

  const renderContent = () => { // ✅ ठीक किया गया नामकरण
    if (isLoading) { // ✅ ठीक किया गया नामकरण
      return (
        <div className="space-y-4"> {/* ✅ ठीक किया गया `className` */}
          {[...Array(3)].map((_, i) => ( {/* ✅ ठीक किया गया `Array` */}
            <Skeleton key={i} className="h-24 w-full rounded-lg" /> {/* ✅ ठीक किया गया नामकरण */}
          ))}
        </div>
      );
    }

    if (error) { // ✅ ठीक किया गया नामकरण
      return <p className="text-red-500">ऑर्डर लोड करने में त्रुटि: {error.message}</p>; {/* ✅ ठीक किया गया `className` */}
    }

    if (!orders || orders.length === 0) {
      return <p className="text-muted-foreground">अभी कोई ऑर्डर नहीं है।</p>; {/* ✅ ठीक किया गया `className` */}
    }

    return (
      <div className="space-y-4"> {/* ✅ ठीक किया गया `className` */}
        {orders.map((order: OrderWithDeliveryBoy) => ( // ✅ ठीक किया गया नामकरण
          <div key={order.id} className="border rounded-lg p-4 mb-4"> {/* ✅ ठीक किया गया `className` */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2"> {/* ✅ ठीक किया गया `className` */}
              <h2 className="font-bold text-lg"> {/* ✅ ठीक किया गया `className` */}
                ऑर्डर #{order.orderNumber || order.id} {/* ✅ ठीक किया गया नामकरण */}
              </h2>
              <div className="flex items-center space-x-2 mt-2 md:mt-0"> {/* ✅ ठीक किया गया `className` */}
                <Badge variant={getStatusBadgeVariant(order.status as string)}> {/* ✅ ठीक किया गया नामकरण */}
                  {getStatusText(order.status)} {/* ✅ ठीक किया गया नामकरण */}
                </Badge>
              </div>
            </div>
            
            {/* ✅ customer */}
            {order.customer && order.deliveryAddress && ( // ✅ ठीक किया गया नामकरण
              <p className="text-sm"> {/* ✅ ठीक किया गया `className` */}
                ग्राहक:{" "}
                <strong>
                  {order.customer.firstName || // ✅ ठीक किया गया नामकरण
                    order.deliveryAddress.fullName || // ✅ ठीक किया गया नामकरण
                    "अज्ञात"}
                </strong>
              </p>
            )}

            {/* ✅ delivery boy info */}
            {order.deliveryboy && (
              <p className="text-sm text-muted-foreground mt-1"> {/* ✅ ठीक किया गया `className` */}
                डिलीवरी बॉय: <strong>{order.deliveryboy.name}</strong>
              </p>
            )}

            {/* ✅ payment info */}
            <p className="text-sm text-muted-foreground"> {/* ✅ ठीक किया गया `className` */}
              भुगतान: <strong>{order.paymentMethod || "लागू नहीं"}</strong> ( {/* ✅ ठीक किया गया नामकरण */}
              {order.paymentStatus || "लंबित"}) {/* ✅ ठीक किया गया नामकरण */}
            </p>
            <p className="text-sm text-muted-foreground"> {/* ✅ ठीक किया गया `className` */}
              कुल: <strong>₹{Number(order.total ?? 0).toLocaleString()}</strong> {/* ✅ ठीक किया गया `Number` और `toLocaleString` */}
            </p>
            <p className="text-sm text-muted-foreground"> {/* ✅ ठीक किया गया `className` */}
              ऑर्डर किया गया: {new Date(order.createdAt).toLocaleString()} {/* ✅ ठीक किया गया `Date` और `createdAt` */}
            </p>

            {/* ✅ items */}
            <div className="mt-4 space-y-3"> {/* ✅ ठीक किया गया `className` */}
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4"> {/* ✅ ठीक किया गया `className` */}
                  <img
                    src={item.product?.image || "/placeholder.png"}
                    alt={item.product?.name || item.name || "product"}
                    className="w-12 h-12 object-cover rounded" // ✅ ठीक किया गया `className`
                  />
                  <div>
                    <p className="font-semibold"> {/* ✅ ठीक किया गया `className` */}
                      {item.product?.name || item.name || "अनाम उत्पाद"}
                    </p>
                    <p className="text-sm text-gray-500"> {/* ✅ ठीक किया गया `className` */}
                      मात्रा: {item.quantity} × ₹
                      {Number(item.unitPrice ?? item.product?.price ?? 0).toLocaleString()} {/* ✅ ठीक किया गया `Number` और `unitPrice` */}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ actions */}
            <div className="flex mt-6 space-x-2"> {/* ✅ ठीक किया गया `className` */}
              {renderStatusActions(order)} {/* ✅ ठीक किया गया नामकरण */}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card> {/* ✅ ठीक किया गया नामकरण */}
      <CardHeader> {/* ✅ ठीक किया गया नामकरण */}
        <CardTitle>आपके ऑर्डर्स</CardTitle> {/* ✅ ठीक किया गया नामकरण */}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent> {/* ✅ ठीक किया गया नामकरण */}
    </Card>
  );
}
