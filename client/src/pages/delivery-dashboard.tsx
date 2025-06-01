import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  LogOut
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);

  // Get delivery boy info from localStorage
  const deliveryBoyId = localStorage.getItem("deliveryBoyId");
  const deliveryBoyName = "Ravi Singh"; // Demo name

  // Fetch assigned orders
  const { data: orders = [], isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: [`/api/delivery/orders`],
    queryParams: { deliveryBoyId }
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/delivery/orders`] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully",
      });
    },
  });

  // Complete delivery with OTP verification
  const completeDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, otp }: { orderId: number; otp: string }) => {
      return await apiRequest("POST", `/api/orders/${orderId}/complete-delivery`, { 
        otp,
        deliveryBoyId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/delivery/orders`] });
      setShowOtpDialog(false);
      setOtpInput("");
      setSelectedOrder(null);
      toast({
        title: "Delivery Completed",
        description: "Order has been marked as delivered successfully",
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
        description: "Please enter the OTP provided by customer",
        variant: "destructive",
      });
      return;
    }
    completeDeliveryMutation.mutate({ 
      orderId: selectedOrder.id, 
      otp: otpInput 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("deliveryBoyToken");
    localStorage.removeItem("deliveryBoyId");
    window.location.href = "/delivery-login";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-yellow-500';
      case 'picked_up': return 'bg-blue-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Ready for Pickup';
      case 'picked_up': return 'Picked Up';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ready': return 'picked_up';
      case 'picked_up': return 'out_for_delivery';
      case 'out_for_delivery': return 'delivered';
      default: return null;
    }
  };

  const getNextStatusText = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ready': return 'Mark as Picked Up';
      case 'picked_up': return 'Start Delivery';
      case 'out_for_delivery': return 'Complete Delivery';
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
      {/* Header */}
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
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-sm text-gray-600">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {orders.filter(o => ['ready', 'picked_up', 'out_for_delivery'].includes(o.status)).length}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {orders.filter(o => o.status === 'delivered').length}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Navigation className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {orders.filter(o => o.status === 'out_for_delivery').length}
                  </p>
                  <p className="text-sm text-gray-600">On Route</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Assigned Orders</h2>
          
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders assigned</h3>
                <p className="text-gray-600">Check back later for new delivery assignments</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Order #{order.orderNumber}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {order.items.length} items • ₹{order.total}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-white`}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Customer & Address Info */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Customer Details</h4>
                        <div className="space-y-2">
                          <p className="font-medium">{order.deliveryAddress.fullName}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{order.deliveryAddress.phone}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Delivery Address</h4>
                        <div className="flex items-start space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <div>
                            <p>{order.deliveryAddress.address}</p>
                            <p>{order.deliveryAddress.city}, {order.deliveryAddress.pincode}</p>
                            {order.deliveryAddress.landmark && (
                              <p className="text-xs">Landmark: {order.deliveryAddress.landmark}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div>
                      <h4 className="font-medium mb-2">Order Items</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm">
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-8 h-8 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-gray-600">Qty: {item.quantity} {item.product.unit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${order.deliveryAddress.phone}`)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Customer
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress.address + ', ' + order.deliveryAddress.city)}`)}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate
                    </Button>

                    {getNextStatus(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (order.status === 'out_for_delivery') {
                            handleCompleteDelivery(order);
                          } else {
                            handleStatusUpdate(order.id, getNextStatus(order.status)!);
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        {getNextStatusText(order.status)}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* OTP Verification Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please ask the customer for their delivery OTP to complete this order.
            </p>
            
            {selectedOrder && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium">Order #{selectedOrder.orderNumber}</p>
                <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress.fullName}</p>
                <p className="text-sm text-gray-600">Total: ₹{selectedOrder.total}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="otp">Enter Customer OTP</Label>
              <Input
                id="otp"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter 4-digit OTP"
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleOtpSubmit}
                disabled={completeDeliveryMutation.isPending || otpInput.length !== 4}
                className="flex-1"
              >
                {completeDeliveryMutation.isPending ? "Verifying..." : "Complete Delivery"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowOtpDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}