import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Interfaces
interface Order {
  id: number;
  status: "pending" | "approved" | "rejected";
  seller: { businessName: string };
  deliveryBoy?: { name: string };
  createdAt: string;
}

// Function to calculate time elapsed
const getTimeElapsed = (createdAt: string): string => {
  const now = new Date();
  const createdDate = new Date(createdAt);
  const diffInMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  return `${diffInHours} hr ago`;
};

const AdminOrderDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!socket) return;
    socket.on("admin:order-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    });
    return () => {
      socket.off("admin:order-updated");
    };
  }, [socket, queryClient]);

  // Fetch all orders
  const { data: allOrders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const res = await api.get("/api/admin/orders");
      return res.data;
    },
  });

  const filteredOrders = allOrders?.filter(order => filter === "all" || order.status === filter);
  const pendingCount = allOrders?.filter(order => order.status === "pending").length || 0;
  const approvedCount = allOrders?.filter(order => order.status === "approved").length || 0;
  const rejectedCount = allOrders?.filter(order => order.status === "rejected").length || 0;

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError) {
    return <div className="text-center text-red-500">Error fetching orders.</div>;
  }

  const approveOrderMutation = useMutation({
    mutationFn: (orderId: number) => api.post(`/api/admin/orders/${orderId}/approve`),
    onSuccess: () => {
      toast({ title: "Order Approved" });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: (orderId: number) => api.post(`/api/admin/orders/${orderId}/reject`),
    onSuccess: () => {
      toast({ title: "Order Rejected" });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Orders Dashboard</h1>
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Filter:</span>
          <Select onValueChange={(value) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
              <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator className="my-4" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Delivery Boy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time Elapsed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">No orders found.</TableCell>
            </TableRow>
          ) : (
            filteredOrders?.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.seller.businessName}</TableCell>
                <TableCell>{order.deliveryBoy?.name || "N/A"}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>{getTimeElapsed(order.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {order.status === "pending" && (
                    <>
                      <Button variant="success" size="sm" onClick={() => approveOrderMutation.mutate(order.id)}>
                        Approve
                      </Button>
                      <Button variant="destructive" size="sm" className="ml-2" onClick={() => rejectOrderMutation.mutate(order.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminOrderDashboard;
    
