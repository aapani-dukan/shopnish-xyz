// client/src/pages/order-confirmation.tsx

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Truck, MapPin, Clock, Phone } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider"; // ✅ नया: AuthProvider से useAuth हुक आयात करें
import { apiRequest } from "@/lib/queryClient"; // ✅ नया: API request utility आयात करें

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  deliveryCharge: string;
  total: string;
  deliveryAddress: {
    fullName: string;
    address: string;
    city: string;
    pincode: string;
    landmark?: string;
    phone: string;
  };
  deliveryInstructions?: string;
  estimatedDeliveryTime: string;
  createdAt: string;
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    product: {
      id: number;
      name: string;
      nameHindi?: string;
      image: string;
      unit: string;
      brand: string;
    };
  }>;
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // ✅ नया: उपयोगकर्ता की प्रमाणीकरण स्थिति प्राप्त करें

  useEffect(() => {
    console.log("Order ID from URL:", orderId);
  }, [orderId]);

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error("Order ID is missing.");
      }
      // ✅ apiRequest का उपयोग करें, जो टोकन को स्वचालित रूप से जोड़ता है
      return await apiRequest("GET", `/api/order-confirmation/${orderId}`);
    },
    // ✅ केवल तभी क्वेरी चलाएं जब orderId मौजूद हो और उपयोगकर्ता प्रमाणित हो
    enabled: !!orderId && isAuthenticated,
  });

  if (isLoading || !isAuthenticated) { // ✅ जब तक प्रमाणित न हो, लोडिंग दिखाएं
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ जब ऑर्डर नहीं मिलता है, तो यहां से कंपोनेंट तुरंत बाहर निकल जाएगा।
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Order not found</h3>
            <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ अब, जब कोड यहां तक पहुंचता है, तो `order` ऑब्जेक्ट निश्चित रूप से मौजूद होगा।
  const estimatedTime = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'Not available';

  const deliveryAddress = order.deliveryAddress;
  const deliveryInstructions = order.deliveryInstructions;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">Thank you for your order. We'll deliver it within 1 hour.</p>
        </div>

        <div className="grid grid-cols-1 lg:col-span-3 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order #{order.orderNumber}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Order Date</p>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Estimated Delivery</p>
                    <p className="font-medium">{estimatedTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment Method</p>
                    <p className="font-medium">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment Status</p>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {deliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Delivery Address</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{deliveryAddress.fullName}</p>
                    <p className="text-gray-600">{deliveryAddress.address}</p>
                    <p className="text-gray-600">{deliveryAddress.city}, {deliveryAddress.pincode}</p>
                    {deliveryAddress.landmark && (
                      <p className="text-sm text-gray-500">Landmark: {deliveryAddress.landmark}</p>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{deliveryAddress.phone}</span>
                    </div>
                    {deliveryInstructions && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Delivery Instructions:</strong> {deliveryInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product.name}</h3>
                        {item.product.nameHindi && <p className="text-sm text-gray-600">{item.product.nameHindi}</p>}
                        <p className="text-sm text-gray-500">{item.product.brand} • {item.product.unit}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{Number(item.unitPrice).toFixed(2)} × {item.quantity}</p>
                        <p className="text-sm text-gray-600">₹{Number(item.totalPrice).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Tracking */}
          <div className="space-y-6">

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span>{parseFloat(order.deliveryCharge) === 0 ? "FREE" : `₹${Number(order.deliveryCharge).toFixed(2)}`}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="w-5 h-5" />
                  <span>Delivery Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Order Confirmed</p>
                      <p className="text-sm text-gray-600">Your order has been placed</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-500">Preparing Order</p>
                      <p className="text-sm text-gray-400">Kumar General Store</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-500">Out for Delivery</p>
                      <p className="text-sm text-gray-400">On the way to you</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-500">Delivered</p>
                      <p className="text-sm text-gray-400">Order completed</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Estimated delivery by {estimatedTime}</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">Your order will be delivered within 1 hour</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/track-order/${order.id}`)}
                className="w-full"
                variant="outline"
              >
                Track Order
              </Button>
              <Button onClick={() => navigate("/")} className="w-full">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
                        }
                          
