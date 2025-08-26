import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { OrderWithItems, Seller, orderStatusEnum } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrderManagerProps {
  orders: OrderWithItems[] | undefined;
  isLoading: boolean;
  error: Error | null;
  seller: Seller;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
    case "out_for_delivery":
      return "info";
    case "delivered":
      return "success";
    case "cancelled":
    case "rejected":
      return "destructive";
    default:
      return "secondary";
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

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: number;
      newStatus: string;
    }) => {
      if (!(orderStatusEnum.enumValues as unknown as string[]).includes(newStatus)) {
        throw new Error("Invalid order status provided.");
      }

      const response = await apiRequest(
        "PATCH",
        `/api/sellers/orders/${orderId}/status`,
        { newStatus }
      );
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

  const renderStatusActions = (order: OrderWithItems) => {
    switch (order.status) {
      case "pending":
      case "placed":
        return (
          <>
            <Button
              variant="success"
              onClick={() => handleStatusUpdate(order.id, "accepted")}
              disabled={isPending}
            >
              Accept
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate(order.id, "rejected")}
              disabled={isPending}
            >
              Reject
            </Button>
          </>
        );
      case "accepted":
        return (
          <Button
            onClick={() => handleStatusUpdate(order.id, "out_for_delivery")}
            disabled={isPending}
          >
            Out for Delivery
          </Button>
        );
      case "out_for_delivery":
        return (
          <Button
            onClick={() => handleStatusUpdate(order.id, "delivered")}
            disabled={isPending}
          >
            Delivered
          </Button>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (error) {
      return <p className="text-red-500">Error loading orders: {error.message}</p>;
    }

    if (!orders || orders.length === 0) {
      return <p className="text-muted-foreground">No orders yet.</p>;
    }

    return (
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border rounded-lg p-4 mb-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
              <h2 className="font-bold text-lg">
                Order #{order.orderNumber || order.id}
              </h2>
              <Badge variant={getStatusBadgeVariant(order.status as string)}>
                {order.status}
              </Badge>
            </div>

            {/* ✅ Customer */}
            
{order.customer && (
  <p className="text-sm">
    Customer: 
    <strong>
      {order.customer.firstName}
    </strong>
    
  </p>
)}
            
            

            {/* ✅ Payment Info */}
            <p className="text-sm text-muted-foreground">
              Payment: <strong>{order.paymentMethod || "N/A"}</strong> (
              {order.paymentStatus || "Pending"})
            </p>
            <p className="text-sm text-muted-foreground">
              Total: <strong>₹{Number(order.total ?? 0).toLocaleString()}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Ordered On: {new Date(order.createdAt).toLocaleString()}
            </p>

            {/* ✅ Items */}
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <img
                    src={item.product?.image || "/placeholder.png"}
                    alt={item.product?.name || item.name || "Product"}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p className="font-semibold">
                      {item.product?.name || item.name || "Unnamed Product"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} × ₹
                      {Number(item.unitPrice ?? item.product?.price ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Actions */}
            <div className="flex mt-6 space-x-2">
              {renderStatusActions(order)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Orders</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
