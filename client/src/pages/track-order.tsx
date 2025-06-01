import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle,
  Circle,
  User,
  Store
} from "lucide-react";

interface OrderTracking {
  id: number;
  orderId: number;
  status: string;
  location: string;
  timestamp: string;
  notes: string;
}

interface DeliveryBoy {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Store {
  id: number;
  storeName: string;
  address: string;
  phone: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  deliveryAddress: any;
  estimatedDeliveryTime: string;
  createdAt: string;
  deliveryBoyId?: number;
  deliveryBoy?: DeliveryBoy;
  items: Array<{
    product: {
      storeId: number;
      store?: Store;
    };
  }>;
}

export default function TrackOrder() {
  const { orderId } = useParams();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  const { data: tracking = [] } = useQuery<OrderTracking[]>({
    queryKey: [`/api/orders/${orderId}/tracking`],
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Order not found</h3>
            <p className="text-gray-600">Unable to track this order</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
      case 'confirmed':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-yellow-500';
      case 'ready':
      case 'picked_up':
        return 'bg-orange-500';
      case 'out_for_delivery':
        return 'bg-purple-500';
      case 'delivered':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'placed': return 'Order Placed';
      case 'confirmed': return 'Order Confirmed';
      case 'preparing': return 'Preparing Order';
      case 'ready': return 'Ready for Pickup';
      case 'picked_up': return 'Picked Up';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const estimatedTime = new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const orderTime = new Date(order.createdAt).toLocaleString('en-IN');

  // Get the store from the first item (assuming single store orders for now)
  const store = order.items?.[0]?.product?.store;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-lg text-gray-600">Order #{order.orderNumber}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Status</span>
                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                    {getStatusText(order.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full ${getStatusColor(order.status)} flex items-center justify-center`}>
                    {order.status === 'delivered' ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : order.status === 'out_for_delivery' ? (
                      <Truck className="w-6 h-6 text-white" />
                    ) : (
                      <Package className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{getStatusText(order.status)}</p>
                    <p className="text-gray-600">
                      {order.status === 'delivered' 
                        ? 'Your order has been delivered successfully'
                        : order.status === 'out_for_delivery'
                        ? `Arriving by ${estimatedTime}`
                        : order.status === 'preparing'
                        ? 'Your order is being prepared'
                        : 'Order confirmed and being processed'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { status: 'placed', label: 'Order Placed', time: orderTime },
                    { status: 'confirmed', label: 'Order Confirmed', time: '5 mins ago' },
                    { status: 'preparing', label: 'Preparing Order', time: order.status === 'preparing' ? 'Now' : null },
                    { status: 'ready', label: 'Ready for Pickup', time: null },
                    { status: 'out_for_delivery', label: 'Out for Delivery', time: null },
                    { status: 'delivered', label: 'Delivered', time: null }
                  ].map((step, index) => {
                    const isCompleted = ['placed', 'confirmed'].includes(step.status) || 
                                     (order.status === 'preparing' && step.status === 'preparing');
                    const isCurrent = order.status === step.status;
                    const isUpcoming = !isCompleted && !isCurrent;

                    return (
                      <div key={step.status} className="flex items-center space-x-4">
                        <div className="relative">
                          <div className={`w-4 h-4 rounded-full ${
                            isCompleted ? 'bg-green-500' : 
                            isCurrent ? getStatusColor(order.status) : 
                            'bg-gray-300'
                          }`}>
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          {index < 5 && (
                            <div className={`absolute top-4 left-2 w-0.5 h-6 ${
                              isCompleted ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {step.label}
                          </p>
                          {step.time && (
                            <p className="text-sm text-gray-600">{step.time}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Details */}
            {order.deliveryBoy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Delivery Partner</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {order.deliveryBoy.firstName} {order.deliveryBoy.lastName}
                      </p>
                      <p className="text-sm text-gray-600">Delivery Partner</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Order Total</span>
                    <span className="font-medium">₹{order.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment</span>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                    </Badge>
                  </div>
                  <hr />
                  <div className="text-sm text-gray-600">
                    <p className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Estimated delivery: {estimatedTime}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Info */}
            {store && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Store className="w-5 h-5" />
                    <span>Store Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{store.storeName}</p>
                    <p className="text-sm text-gray-600">{store.address}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-600">Contact Store</span>
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Delivery Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{order.deliveryAddress.fullName}</p>
                  <p className="text-sm text-gray-600">{order.deliveryAddress.address}</p>
                  <p className="text-sm text-gray-600">
                    {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{order.deliveryAddress.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}