import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { socket } from "@/lib/socket"; // ✅ socket.io client helper

// इंटरफ़ेस जो API से आने वाले डेटा को परिभाषित करता है।
interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string; // ✅ सेलर का स्टेटस
  deliveryStatus: string; // ✅ डिलीवरी बॉय का स्टेटस
  total: string;
  createdAt: string;
}

// ऑर्डर स्टेटस के लिए बैज का वेरिएंट (रंग) निर्धारित करता है।
const statusBadgeVariants = {
  pending: "secondary",
  accepted: "secondary",
  preparing: "secondary",
  ready_for_pickup: "secondary",
  picked_up: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "destructive",
  rejected: "destructive",
  default: "secondary",
};

const getStatusBadgeVariant = (status: string, deliveryStatus: string) => {
  if (deliveryStatus) {
    return statusBadgeVariants[deliveryStatus] || statusBadgeVariants.default;
  }
  return statusBadgeVariants[status] || statusBadgeVariants.default;
};

// दोनों स्टेटस को मिलाकर एक कंबाइंड टेक्स्ट बनाता है
const getCombinedStatus = (status: string, deliveryStatus: string) => {
  if (deliveryStatus === "picked_up") return "पिकअप हो गया";
  if (deliveryStatus === "out_for_delivery") return "रास्ते में है";
  if (deliveryStatus === "delivered") return "डिलीवर हो गया";
  
  // अगर deliveryStatus नहीं है या अभी तक शुरू नहीं हुआ है, तो seller status दिखाओ
  switch (status) {
    case "pending":
      return "लंबित";
    case "accepted":
      return "स्वीकृत";
    case "preparing":
      return "तैयार हो रहा है";
    case "ready_for_pickup":
      return "पिकअप के लिए तैयार";
    case "cancelled":
      return "रद्द कर दिया गया";
    case "rejected":
      return "अस्वीकृत";
    default:
      return "Unknown";
  }
};

// ग्राहक के ऑर्डर दिखाने वाला मुख्य कंपोनेंट।
export default function CustomerOrdersPage() {
  const queryClient = useQueryClient();

  // TanStack Query का उपयोग करके API से ऑर्डर फ़ेच करें।
  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["customerOrders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orders");
      return response;
    },
  });

  // ✅ Socket.IO से order updates सुनें
  useEffect(() => {
    // सेलर द्वारा अपडेट किया गया स्टेटस
    socket.on("order:status-updated", (updatedOrder) => {
      console.log("📦 Order update received from seller:", updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["customerOrders"] });
    });

    // डिलीवरी बॉय द्वारा अपडेट किया गया स्टेटस
    socket.on("order:delivery-status-updated", (updatedOrder) => {
      console.log("🚚 Order update received from delivery boy:", updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["customerOrders"] });
    });

    return () => {
      socket.off("order:status-updated");
      socket.off("order:delivery-status-updated");
    };
  }, [queryClient]);

  // लोडिंग की स्थिति को हैंडल करें।
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // एरर की स्थिति को हैंडल करें।
  if (isError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">
          Error loading orders: {(error as Error).message}
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // ✅ खाली डेटा को हैंडल करें।
  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center">
        <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No orders found</h2>
        <p className="text-gray-600">
          You haven't placed any orders yet. Start shopping now!
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Go Shopping</Link>
        </Button>
      </div>
    );
  }

  // ऑर्डरों को प्रदर्शित करें।
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      <div className="space-y-4">
        {orders.map((order: CustomerOrder) => (
          <Card key={order.id} className="p-4">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>Order #{order.orderNumber}</span>
                <Badge variant={getStatusBadgeVariant(order.status, order.deliveryStatus)}>
                  {getCombinedStatus(order.status, order.deliveryStatus)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  <p>
                    <span className="font-medium text-gray-800">Date:</span>{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium text-gray-800">Total:</span> ₹
                    {Number(order.total).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium text-gray-800">Status:</span>{" "}
                    {getCombinedStatus(order.status, order.deliveryStatus)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button asChild>
                  <Link to={`/order-confirmation/${order.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
