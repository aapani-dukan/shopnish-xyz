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
          <Card key={order.id} className="p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
              <h4 className="font-semibold text-lg">Order ID: {order.id}</h4>
              <Badge variant={getStatusBadgeVariant(order.status as string)}>
                {order.status}
              </Badge>
            </div>

            {order.customer && (
              <p className="text-sm">
                Customer: **{order.customer.name}**{" "}
                {order.customer.phone && `(${order.customer.phone})`}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Payment: **{order.paymentMethod || "N/A"}** ({order.paymentStatus || "Pending"})
            </p>
            <p className="text-sm text-muted-foreground">
              Total: **₹{Number(order.total).toLocaleString()}**
            </p>
            <p className="text-sm text-muted-foreground">
              Ordered On: {new Date(order.createdAt).toLocaleString()}
            </p>

            <div className="mt-4">
              <h5 className="font-medium text-sm mb-2">Items:</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.product?.name || item.name} (
                    {item.quantity} × ₹
                    {Number(item.product?.price || item.price)})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex mt-6 space-x-2">
              {renderStatusActions(order)}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

