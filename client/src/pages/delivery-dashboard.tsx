import React, { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// QueryClient का एक इंस्टेंस बनाएँ
const queryClient = new QueryClient();

// आप इन utility functions को एक अलग फ़ाइल में बना सकते हैं
const apiRequest = async (method, url, data = null) => {
  const token = localStorage.getItem("deliveryBoyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const options = {
    method,
    headers,
    ...(data && { body: JSON.stringify(data) }),
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API call failed with status: ${response.status}`);
  }
  return response.json();
};

const useToast = () => {
    return {
        toast: ({ title, description, variant }) => {
            // यह केवल एक कंसोल लॉग है, आप इसे वास्तविक UI कंपोनेंट से बदल सकते हैं
            console.log(`टोस्ट: ${title} - ${description} (Variant: ${variant})`);
        }
    };
};

const Button = ({ children, onClick, variant, size, disabled, className = '', ...props }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-md transition-colors ${variant === 'outline' ? 'border border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    {...props}
  >
    {children}
  </button>
);
const Card = ({ children }) => <div className="bg-white rounded-xl shadow-lg p-6">{children}</div>;
const CardContent = ({ children, className }) => <div className={`p-0 ${className}`}>{children}</div>;
const CardHeader = ({ children }) => <div className="pb-4 border-b border-gray-200 mb-4">{children}</div>;
const CardTitle = ({ children }) => <h2 className="text-xl font-bold text-gray-800">{children}</h2>;
const Input = ({ ...props }) => <input className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500" {...props} />;
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="block mb-2 font-medium text-gray-700">{children}</label>;
const Badge = ({ children, className }) => <span className={`px-3 py-1 text-xs font-semibold rounded-full ${className}`}>{children}</span>;
const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform scale-100 transition-transform duration-300">
        {children}
      </div>
    </div>
  );
};
const DialogContent = ({ children }) => <div>{children}</div>;
const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }) => <h3 className="text-lg font-bold text-gray-800">{children}</h3>;

const Icons = {
  Package: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v18H3c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h3m0-1v2H3a1 1 0 00-1 1v14a1 1 0 001 1h3v2m15 0H9m0-2h12v-2H9m0-2h12V7H9m0-2h12V3H9z" /></svg>),
  Navigation: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>),
  Phone: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2.06l-4.72-.94a2 2 0 01-1.87-1.42l-.24-.96a1 1 0 00-.91-.71l-2.45-.16a1 1 0 00-.73.34l-3.5 3.5a1 1 0 01-.7.29a.9.9 0 01-.7-.29L2.8 19.29a2 2 0 01-.58-1.58V14a2 2 0 012-2h3a2 2 0 012 2v2" /></svg>),
  MapPin: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-4.42 0-8 3.58-8 8s8 12 8 12 8-7.58 8-12-3.58-8-8-8zm0 10a2 2 0 100-4 2 2 0 000 4z" /></svg>),
  Clock: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>),
  CheckCircle: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-8.82" /><path d="M13.5 8L10 11.5l-2-2" /></svg>),
  User: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  LogOut: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  ShieldCheck: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5c0-1.2-.8-2-2-2H6c-1.2 0-2 .8-2 2v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>),
  Plus: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>)
};

/* -------------------------------------------------------------------------- */
/* Types                                    */
/* -------------------------------------------------------------------------- */

// DeliveryOrder प्रकार की परिभाषा
const deliveryOrder = {
  id: 0,
  orderNumber: '',
  customerId: 0,
  customerName: '',
  customerPhone: '',
  deliveryAddress: {
    fullName: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    landmark: '',
  },
  total: '',
  paymentMethod: '',
  status: 'ready',
  estimatedDeliveryTime: '',
  deliveryOtp: '',
  items: [
    {
      id: 0,
      quantity: 0,
      product: {
        name: '',
        nameHindi: '',
        image: '',
        unit: '',
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Helper Functions                              */
/* -------------------------------------------------------------------------- */
const statusColor = (status) => {
  switch (status) {
    case "ready": return "bg-yellow-500";
    case "picked_up": return "bg-blue-500";
    case "out_for_delivery": return "bg-purple-500";
    case "delivered": return "bg-green-500";
    default: return "bg-gray-500";
  }
};

const statusText = (status) => {
  switch (status) {
    case "ready": return "तैयार";
    case "picked_up": return "उठाया गया";
    case "out_for_delivery": return "डिलीवरी पर";
    case "delivered": return "डिलीवर किया गया";
    default: return status;
  }
};

const nextStatus = (status) => {
  switch (status) {
    case "ready": return "picked_up";
    case "picked_up": return "out_for_delivery";
    case "out_for_delivery": return "delivered";
    default: return null;
  }
};

const nextStatusLabel = (status) => {
  switch (status) {
    case "ready": return "उठाया गया";
    case "picked_up": return "डिलीवरी शुरू करें";
    case "out_for_delivery": return "डिलीवरी पूरी करें";
    default: return "";
  }
};

/* -------------------------------------------------------------------------- */
/* Main Component                                */
/* -------------------------------------------------------------------------- */

const DeliveryDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  const deliveryBoyId = localStorage.getItem("deliveryBoyId") || 'demo-id-123';
  const deliveryBoyName = "रवि सिंह";

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/delivery/orders", deliveryBoyId],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/delivery/orders?deliveryBoyId=${encodeURIComponent(
          deliveryBoyId
        )}`
      ),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      status,
    }) => apiRequest("PATCH", `/api/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      toast({
        title: "स्थिति अपडेट की गई",
        description: "ऑर्डर की स्थिति सफलतापूर्वक अपडेट की गई।",
      });
    },
  });

  const completeDelivery = useMutation({
    mutationFn: ({
      orderId,
      otp,
    }) =>
      apiRequest("POST", `/api/orders/${orderId}/complete-delivery`, {
        otp,
        deliveryBoyId,
      }),
    onSuccess: () => {
      setOtp("");
      setOtpDialogOpen(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      toast({
        title: "डिलीवरी पूरी हुई",
        description: "ऑर्डर को डिलीवर के रूप में चिह्नित किया गया।",
      });
    },
    onError: () => {
      toast({
        title: "गलत OTP",
        description: "कृपया OTP जांचें और फिर से कोशिश करें।",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("deliveryBoyToken");
    localStorage.removeItem("deliveryBoyId");
    // navigate("/delivery-login"); // यहाँ navigate को उपयोग करने के लिए react-router-dom की जरूरत है
  };

  const handleStatusProgress = (order) => {
    if (order.status === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(order.status);
    if (next) {
      updateStatus.mutate({ orderId: order.id, status: next });
    }
  };

  const handleOtpSubmit = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({
        title: "OTP दर्ज करें",
        description: "4-अंकीय OTP आवश्यक है।",
        variant: "destructive",
      });
      return;
    }
    completeDelivery.mutate({ orderId: selectedOrder.id, otp });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const availableOrders = orders.filter(order => order.status === 'ready');
  const myOrders = orders.filter(order => ['picked_up', 'out_for_delivery'].includes(order.status));

  const renderOrderList = (list, title) => (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">{title}</h2>
      <div className="space-y-6">
        {list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">कोई ऑर्डर नहीं</h3>
              <p>अभी कोई ऑर्डर उपलब्ध नहीं है।</p>
            </CardContent>
          </Card>
        ) : (
          list.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ऑर्डर #{order.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {order.items.length} आइटम • ₹{order.total}
                    </p>
                  </div>
                  <Badge className={`${statusColor(order.status)} text-white`}>
                    {statusText(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">ग्राहक विवरण</h4>
                      <p className="font-medium">
                        {order.deliveryAddress.fullName}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Icons.Phone className="w-4 h-4" />
                        <span>{order.deliveryAddress.phone}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">डिलीवरी पता</h4>
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <Icons.MapPin className="w-4 h-4 mt-0.5" />
                        <div>
                          <p>{order.deliveryAddress.address}</p>
                          <p>
                            {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">ऑर्डर आइटम्स</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-3 text-sm"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-gray-600">
                              Qty: {item.quantity} {item.product.unit}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`tel:${order.deliveryAddress.phone}`)}
                  >
                    <Icons.Phone className="w-4 h-4 mr-2" />
                    ग्राहक को कॉल करें
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress.address)}`)}
                  >
                    <Icons.Navigation className="w-4 h-4 mr-2" />
                    नेविगेट करें
                  </Button>
                  <Button
                    onClick={() => handleStatusProgress(order)}
                    disabled={updateStatus.isLoading || completeDelivery.isLoading}
                  >
                    {nextStatusLabel(order.status)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800">
      <header className="bg-white p-6 shadow-md rounded-b-3xl text-center sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Icons.User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">डिलीवरी डैशबोर्ड</h1>
              <p className="text-sm text-gray-600">
                वापस स्वागत है, {deliveryBoyName}
              </p>
            </div>
          </div>
          <Button onClick={handleLogout}>
            <Icons.LogOut className="w-4 h-4 mr-1" />
            लॉगआउट
          </Button>
        </div>
      </header>
      <main className="p-6">
        {renderOrderList(availableOrders, "नए ऑर्डर")}
        {renderOrderList(myOrders, "मेरे स्वीकृत ऑर्डर")}
      </main>
      
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>डिलीवरी पूरी करें</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 mb-4">
            डिलीवरी की पुष्टि करने के लिए ग्राहक से 4-अंकीय OTP मांगें।
          </div>
          {selectedOrder && (
            <div className="p-4 bg-blue-50 rounded-lg mb-4 text-sm">
              <p className="font-medium">ऑर्डर #{selectedOrder.orderNumber}</p>
              <p>ग्राहक: {selectedOrder.deliveryAddress.fullName}</p>
              <p>कुल: ₹{selectedOrder.total}</p>
            </div>
          )}
          <div className="mb-4">
            <Label htmlFor="otp">OTP दर्ज करें</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="0000"
              maxLength={4}
              type="text"
              pattern="\d*"
              inputMode="numeric"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleOtpSubmit}
              disabled={completeDelivery.isLoading || otp.trim().length !== 4}
              className="flex-1"
            >
              पुष्टि करें
            </Button>
            <Button
              variant="outline"
              onClick={() => setOtpDialogOpen(false)}
            >
              रद्द करें
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// React-Query को App कंपोनेंट के बाहर लपेटें
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeliveryDashboard />
    </QueryClientProvider>
  );
}

