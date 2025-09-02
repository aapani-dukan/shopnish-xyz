import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

// इंटरफ़ेस (Interface) जो API से आने वाले डेटा को परिभाषित करता है।
interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
}

// ऑर्डर स्टेटस के लिए बैज का वेरिएंट (रंग) निर्धारित करता है।
// स्विच स्टेटमेंट की जगह ऑब्जेक्ट का उपयोग करना कोड को अधिक पठनीय और स्केलेबल बनाता है।
const statusBadgeVariants = {
  pending: "secondary",
  accepted: "secondary",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "destructive",
  rejected: "destructive",
  default: "secondary",
};

const getStatusBadgeVariant = (status: string) => {
  return statusBadgeVariants[status] || statusBadgeVariants.default;
};

// ग्राहक के ऑर्डर दिखाने वाला मुख्य कंपोनेंट।
export default function CustomerOrdersPage() {
  // TanStack Query का उपयोग करके API से ऑर्डर फ़ेच करें।
  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["customerOrders"],
    queryFn: async () => {
      // ✅ API route to be created on the backend
      const response = await apiRequest("GET", "/api/orders");
      return response;
    },
  });

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
        <p className="text-red-500">Error loading orders: {error.message}</p>
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
                {/* हमने back-end लॉजिक से मेल खाने के लिए order.id के बजाय order.orderNumber का उपयोग किया है */}
                <span>Order #{order.orderNumber}</span>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
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
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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

