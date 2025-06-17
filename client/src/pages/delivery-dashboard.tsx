"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui"; // ✅ assuming you're exporting grouped from index.ts
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Package,
  Navigation,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface DeliveryOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  total: string;
  paymentMethod: string;
  status: string;
  estimatedDeliveryTime: string;
  deliveryOtp: string;
  items: Array<{
    id: number;
    quantity: number;
    product: {
      name: string;
      nameHindi: string;
      image: string;
      unit: string;
    };
  }>;
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);

  const deliveryBoyId = localStorage.getItem("deliveryBoyId");
  const deliveryBoyName = "Ravi Singh"; // 👤 demo name

  // 🔐 Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem("deliveryBoyToken");
    if (!token) {
      navigate("/delivery-login");
    }
  }, []);

  const { data: orders = [], isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: [`/api/delivery/orders`],
    queryParams: { deliveryBoyId },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/delivery/orders`] });
      toast({
        title: "Status Updated",
        description: "Order status updated successfully",
      });
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/complete-delivery`, {
        otp,
        deliveryBoyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/delivery/orders`] });
      setShowOtpDialog(false);
      setOtpInput("");
      setSelectedOrder(null);
      toast({
        title: "Delivery Completed",
        description: "Order marked as delivered",
      });
    },
    onError: () => {
      toast({
        title: "Invalid OTP",
        description: "Please check the OTP and try again",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("deliveryBoyToken");
    localStorage.removeItem("deliveryBoyId");
    navigate("/delivery-login");
  };

  const handleAdminLogin = () => {
    navigate("/admin");
  };

  const handleStatusUpdate = (orderId: number, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const handleCompleteDelivery = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setShowOtpDialog(true);
  };

  const handleOtpSubmit = () => {
    if (!selectedOrder || !otpInput) {
      toast({
        title: "OTP Required",
        description: "Please enter OTP",
        variant: "destructive",
      });
      return;
    }
    completeDeliveryMutation.mutate({ orderId: selectedOrder.id, otp: otpInput });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-yellow-500";
      case "picked_up": return "bg-blue-500";
      case "out_for_delivery": return "bg-purple-500";
      case "delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Picked Up";
      case "out_for_delivery": return "Out for Delivery";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "ready": return "picked_up";
      case "picked_up": return "out_for_delivery";
      case "out_for_delivery": return "delivered";
      default: return null;
    }
  };

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case "ready": return "Mark as Picked Up";
      case "picked_up": return "Start Delivery";
      case "out_for_delivery": return "Complete Delivery";
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🧭 Header with Admin Login */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Delivery Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {deliveryBoyName}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleAdminLogin}>
                <ShieldCheck className="w-4 h-4 mr-1" />
                Admin Login
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 📦 Rest of the dashboard remains same (orders, dialogs etc.) */}
      {/* ... */}
      {/* Include your complete existing JSX code for orders + dialog below this header */}

      {/* 📌 NOTE: You can paste your original orders + dialog JSX here without changes */}
    </div>
  );
}
