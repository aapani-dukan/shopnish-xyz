import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { OrderWithItems, Seller, orderStatusEnum } from "@shared/backend/schema"; // ✅ orderStatusEnum को आयात करें
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderManagerProps {
  orders: OrderWithItems[] | undefined;
  isLoading: boolean;
  error: Error | null;
  seller: Seller;
}

// ✅ एक हेल्पर फ़ंक्शन जो स्थिति (status) के आधार पर रंग देता है
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending':
    case 'accepted':
    case 'preparing':
    case 'out_for_delivery':
      return 'secondary';
    case 'delivered':
      return 'default'; // या कोई अन्य सफलता का रंग
    case 'cancelled':
    case 'rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function OrderManager({ orders, isLoading, error, seller }: OrderManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({ // ✅ isPending का उपयोग करें
    mutationFn: async ({ orderId, newStatus }: { orderId: number; newStatus: string }) => {
      // ✅ सुनिश्चित करें कि नई स्थिति मान्य है
      if (!orderStatusEnum.enumValues.includes(newStatus as any)) {
        throw new Error("Invalid order status provided.");
      }
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
    mutate({ orderId, newStatus });
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
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Order ID: {order.id}</h4>
                  {order.customer?.name && (
                    <p className="text-sm font-medium">Customer: {order.customer.name}</p>
                  )}
                  {/* ✅ अब, स्थिति के आधार पर सही रंग दिखाएं */}
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
                          <>{item.product.name} ({item.quantity} x ₹{item.product.price})</>
                        ) : (
                          `Product details not available (x${item.quantity})`
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* ✅ केवल तभी बटन दिखाएं जब स्थिति 'pending' हो */}
                {order.status === 'pending' && (
                  <div className="flex mt-4 space-x-2">
                    <Button
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, 'accepted')}
                      disabled={isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, 'rejected')}
                      disabled={isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
