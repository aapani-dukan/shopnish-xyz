import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { OrderWithItems, Seller } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Truck, PackageCheck, Ban } from "lucide-react"; // ✅ नए आइकन्स जोड़ें

interface OrderManagerProps {
  orders: OrderWithItems[] | undefined;
  isLoading: boolean;
  error: Error | null;
  seller: Seller;
}

export default function OrderManager({ orders, isLoading, error, seller }: OrderManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusUpdateMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: string }) => {
      // ✅ API कॉल को अपडेट करें
      const response = await apiRequest("PATCH", `/api/sellers/orders/${orderId}/status`, { newStatus });
      return response;
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
    handleStatusUpdateMutation.mutate({ orderId, newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
      case "accepted":
        return "secondary";
      case "completed":
        return "default";
      case "cancelled":
      case "rejected":
        return "destructive";
      case "preparing":
      case "ready_for_pickup":
      case "out_for_delivery":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-red-500">Error loading orders: {error.message}</p>
        ) : orders && orders.length === 0 ? (
          <p className="text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders?.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                  <h4 className="font-semibold">Order ID: #{order.id}</h4>
                  {order.customer?.name && (
                    <p className="text-sm font-medium">Customer: {order.customer.name}</p>
                  )}
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Total: ₹{parseFloat(order.total).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Ordered On: {new Date(order.createdAt).toLocaleString()}</p>
                <div className="mt-2">
                  <h5 className="font-medium text-sm mb-1">Items:</h5>
                  <ul className="list-disc list-inside text-sm">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product ? (
                          `${item.product.name} (${item.quantity} x ₹${item.product.price})`
                        ) : (
                          `Product ID #${item.id} not found (${item.quantity} x ₹?)`
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ✅ डायनेमिक बटन्स */}
                <div className="flex mt-4 space-x-2">
                  {order.status === "pending" && (
                    <>
                      <Button
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                        onClick={() => handleStatusUpdate(order.id, 'accepted')}
                        disabled={handleStatusUpdateMutation.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                        onClick={() => handleStatusUpdate(order.id, 'rejected')}
                        disabled={handleStatusUpdateMutation.isPending}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {order.status === "accepted" && (
                    <Button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      disabled={handleStatusUpdateMutation.isPending}
                    >
                      Prepare Order
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button
                      className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, 'ready_for_pickup')}
                      disabled={handleStatusUpdateMutation.isPending}
                    >
                      Ready for Pickup
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
