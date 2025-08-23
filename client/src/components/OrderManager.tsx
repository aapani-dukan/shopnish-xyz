import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { OrderWithItems, Seller, orderStatusEnum } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface OrderManagerProps {
  orders: OrderWithItems[] | undefined;
  isLoading: boolean;
  error: Error | null;
  seller: Seller;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending":
    case "preparing":
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
      // ✅ Validate status against enum
      if (!(orderStatusEnum.enumValues as unknown as string[]).includes(newStatus)) {
        throw new Error("Invalid order status provided.");
      }

      // ✅ Fix API call template string
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

  useEffect(() => {
    if (orders) {
      console.log("Received orders data:", orders);
    }
  }, [orders]);

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
                  <Badge variant={getStatusBadgeVariant(order.status as any)}>
                    {order.status}
                  </Badge>
                </div>

                {/* ✅ Customer Info */}
                {order.customer && (
                  <p className="text-sm">
                    Customer: {order.customer.name}{" "}
                    {order.customer.phone && `(${order.customer.phone})`}
                  </p>
                )}

                {/* ✅ Payment Info */}
                <p className="text-sm text-muted-foreground">
                  Payment: {order.paymentMethod || "N/A"} (
                  {order.paymentStatus || "Pending"})
                </p>

                {/* ✅ Total + Date */}
                <p className="text-sm text-muted-foreground">
                  Total: ₹{Number(order.total).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ordered On: {new Date(order.createdAt).toLocaleString()}
                </p>

                {/* ✅ Items */}
                <div className="mt-2">
                  <h5 className="font-medium text-sm mb-1">Items:</h5>
                  <ul className="list-disc list-inside text-sm">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.product?.name || item.name} (
                        {item.quantity} × ₹
                        {Number(item.product?.price || item.price)})
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ✅ Status Actions */}
                {order.status === "pending" && (
                  <div className="flex mt-4 space-x-2">
                    <Button
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, "accepted")}
                      disabled={isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                      onClick={() => handleStatusUpdate(order.id, "rejected")}
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
