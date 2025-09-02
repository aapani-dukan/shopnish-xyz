import React, { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  setLogLevel
} from "firebase/firestore";

// Firestore logs को सक्षम करें
setLogLevel('debug');

// TanStack QueryClient को App कंपोनेंट के बाहर बनाएँ
const queryClient = new QueryClient();

// Firestore और Firebase Auth के लिए ग्लोबल वैरिएबल
// ये वैरिएबल रनटाइम पर आपके एनवायरनमेंट से स्वतः ही प्रदान किए जाते हैं।
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mock utility functions from the original code for a single file component
const useToast = () => {
    return {
        toast: ({ title, description, variant }) => {
            console.log(`Toast: ${title} - ${description} (Variant: ${variant})`);
        }
    };
};

const Button = ({ children, onClick, variant, size, disabled, ...props }) => (
    <button onClick={onClick} disabled={disabled} className={`p-2 rounded-md ${variant === 'outline' ? 'border' : 'bg-blue-500 text-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>
        {children}
    </button>
);
const Card = ({ children }) => <div className="bg-white rounded-lg shadow-md p-4">{children}</div>;
const CardContent = ({ children, className }) => <div className={`p-4 ${className}`}>{children}</div>;
const CardHeader = ({ children }) => <div className="p-4 border-b">{children}</div>;
const CardTitle = ({ children }) => <h2 className="text-xl font-bold">{children}</h2>;
const Input = ({ ...props }) => <input className="border p-2 rounded-md w-full" {...props} />;
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="block mb-1 font-medium">{children}</label>;
const Badge = ({ children, className }) => <span className={`px-2 py-1 text-xs rounded-full ${className}`}>{children}</span>;
const Dialog = ({ open, onOpenChange, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                {children}
            </div>
        </div>
    );
};
const DialogContent = ({ children }) => <div>{children}</div>;
const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }) => <h3 className="text-lg font-bold">{children}</h3>;

// Inline SVG Icons
const Package = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v18H3c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h3m0-1v2H3a1 1 0 00-1 1v14a1 1 0 001 1h3v2m15 0H9m0-2h12v-2H9m0-2h12V7H9m0-2h12V3H9z" /></svg>);
const Navigation = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>);
const Phone = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2.06l-4.72-.94a2 2 0 01-1.87-1.42l-.24-.96a1 1 0 00-.91-.71l-2.45-.16a1 1 0 00-.73.34l-3.5 3.5a1 1 0 01-.7.29a.9.9 0 01-.7-.29L2.8 19.29a2 2 0 01-.58-1.58V14a2 2 0 012-2h3a2 2 0 012 2v2" /></svg>);
const MapPin = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-4.42 0-8 3.58-8 8s8 12 8 12 8-7.58 8-12-3.58-8-8-8zm0 10a2 2 0 100-4 2 2 0 000 4z" /></svg>);
const Clock = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>);
const CheckCircle = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-8.82" /><path d="M13.5 8L10 11.5l-2-2" /></svg>);
const User = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const LogOut = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);
const ShieldCheck = (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5c0-1.2-.8-2-2-2H6c-1.2 0-2 .8-2 2v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>);


/* -------------------------------------------------------------------------- */
/* Helper Functions                                                           */
/* -------------------------------------------------------------------------- */

const statusColor = (status) => {
  switch (status) {
    case "ready":
    case "pending":
      return "bg-yellow-500";
    case "picked_up":
      return "bg-blue-500";
    case "out_for_delivery":
      return "bg-purple-500";
    case "delivered":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const statusText = (status) => {
  switch (status) {
    case "ready":
    case "pending":
      return "पिकअप के लिए तैयार";
    case "picked_up":
      return "पिकअप किया गया";
    case "out_for_delivery":
      return "डिलीवरी के लिए निकला";
    case "delivered":
      return "डिलीवर किया गया";
    default:
      return status;
  }
};

const nextStatus = (status) => {
  switch (status) {
    case "ready":
    case "pending":
      return "picked_up";
    case "picked_up":
      return "out_for_delivery";
    case "out_for_delivery":
      return "delivered";
    default:
      return null;
  }
};

const nextStatusLabel = (status) => {
  switch (status) {
    case "ready":
    case "pending":
      return "पिकअप के रूप में चिह्नित करें";
    case "picked_up":
      return "डिलीवरी शुरू करें";
    case "out_for_delivery":
      return "डिलीवरी पूरी करें";
    default:
      return "";
  }
};

/* -------------------------------------------------------------------------- */
/* Component Start                                                            */
/* -------------------------------------------------------------------------- */

const DeliveryDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orders, setOrders] = useState([]);
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);

  // local state for OTP dialog
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  // ─── Firebase Initialization and Auth ───
  useEffect(() => {
    try {
      // अगर पहले से ही कोई Firebase ऐप शुरू हो चुका है, तो दोबारा शुरू न करें
      if (!getApps().length) {
        const app = initializeApp(firebaseConfig);
        const tempAuth = getAuth(app);
        const tempDb = getFirestore(app);
        setAuth(tempAuth);
        setDb(tempDb);
      } else {
        const tempAuth = getAuth();
        const tempDb = getFirestore();
        setAuth(tempAuth);
        setDb(tempDb);
      }

      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setAuthReady(true);
        } else {
          // यदि auth token मौजूद है, तो custom token के साथ साइन इन करें
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            // अन्यथा, गुमनाम रूप से साइन इन करें
            await signInAnonymously(auth);
          }
        }
      });

      return () => unsubscribeAuth();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
    }
  }, [auth]);

  // ─── Firestore Real-time Listener ───
  useEffect(() => {
    if (!authReady || !userId || !db) return;

    try {
      // केवल उन्हीं ऑर्डर्स को फ़ेच करें जो इस डिलीवरी बॉय को असाइन किए गए हैं
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("deliveryBoyId", "==", userId));

      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const fetchedOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(fetchedOrders);
        console.log("Firebase से फ़ेच किया गया डेटा:", fetchedOrders);
      }, (error) => {
          console.error("Firestore data fetch failed:", error);
          toast({
              title: "डेटा फ़ेच करने में त्रुटि",
              description: "ऑर्डर फ़ेच करते समय एक समस्या हुई। कृपया पुनः प्रयास करें।",
              variant: "destructive"
          });
      });

      // जब कंपोनेंट अनमाउंट हो तो listener को साफ़ करें
      return () => unsubscribeFirestore();
    } catch (error) {
        console.error("Failed to set up Firestore listener:", error);
    }
  }, [authReady, userId, db, toast]);


  // ─── React Query Mutations ───
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => {
      if (!db) {
        console.error("Firestore DB is not initialized.");
        return Promise.reject("Firestore DB is not initialized.");
      }
      const orderRef = doc(db, "orders", orderId);
      return updateDoc(orderRef, { status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      toast({
        title: "स्टेटस अपडेट किया गया",
        description: "ऑर्डर का स्टेटस सफलतापूर्वक अपडेट किया गया।",
      });
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      toast({
        title: "स्टेटस अपडेट करने में त्रुटि",
        description: "कृपया पुनः प्रयास करें।",
        variant: "destructive",
      });
    },
  });

  const handleOtpSubmit = useMutation({
    mutationFn: ({ orderId, otp }) => {
      if (!db) {
        console.error("Firestore DB is not initialized.");
        return Promise.reject("Firestore DB is not initialized.");
      }
      // OTP के साथ डिलीवरी पूरी करने के लिए एक API कॉल
      const orderRef = doc(db, "orders", orderId);
      return updateDoc(orderRef, {
        status: "delivered",
        deliveryOtp: otp // Note: A real app should verify this on the backend
      });
    },
    onSuccess: () => {
      setOtp("");
      setOtpDialogOpen(false);
      setSelectedOrder(null);
      toast({
        title: "डिलीवरी पूरी हुई",
        description: "ऑर्डर को सफलतापूर्वक डिलीवर किया गया।",
      });
    },
    onError: (error) => {
      console.error("OTP submission failed:", error);
      toast({
        title: "गलत OTP",
        description: "कृपया OTP जांचें और फिर से प्रयास करें।",
        variant: "destructive",
      });
    },
  });

  // ─── Handlers ───
  const handleStatusProgress = (order) => {
    if (order.status === "out_for_delivery") {
      setSelectedOrder(order);
      setOtpDialogOpen(true);
      return;
    }
    const next = nextStatus(order.status);
    if (next) {
      updateStatusMutation.mutate({ orderId: order.id, status: next });
    }
  };

  const handleOtpConfirmation = () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      toast({
        title: "OTP दर्ज करें",
        description: "4-अंकों का OTP आवश्यक है।",
        variant: "destructive",
      });
      return;
    }
    handleOtpSubmit.mutate({ orderId: selectedOrder.id, otp });
  };
  
  const handleLogout = () => {
    if (!auth) {
        console.error("Auth object is not available.");
        return;
    }
    auth.signOut().then(() => {
        // आप यहाँ एक लॉगिन स्क्रीन पर रीडायरेक्ट कर सकते हैं,
        // लेकिन इस सिंगल-फाइल कंपोनेंट में, हम बस पेज रीलोड कर रहे हैं।
        window.location.reload();
    }).catch((error) => {
        console.error("Sign out error", error);
    });
  };

  /* ----------------------------- Loading & Empty State ----------------------------------- */
  if (!authReady || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ----------------------------- JSX --------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 font-inter text-gray-800">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm border-b rounded-b-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* left */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">डिलीवरी डैशबोर्ड</h1>
              <p className="text-sm text-gray-600">
                वापस स्वागत है, डिलीवरी बॉय!
              </p>
            </div>
          </div>
          {/* right */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              लॉगआउट
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-sm text-gray-600">कुल ऑर्डर</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o) =>
                  ["ready", "picked_up", "out_for_delivery", "pending"].includes(o.status)
                ).length}
              </p>
              <p className="text-sm text-gray-600">लंबित</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o) => o.status === "delivered").length}
              </p>
              <p className="text-sm text-gray-600">पूरे हुए</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-3">
            <Navigation className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">
                {orders.filter((o) => o.status === "out_for_delivery").length}
              </p>
              <p className="text-sm text-gray-600">रास्ते में</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Orders List ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
        <h2 className="text-2xl font-bold">असाइन किए गए ऑर्डर</h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">कोई ऑर्डर असाइन नहीं</h3>
              <p className="text-gray-600">
                नए डिलीवरी असाइनमेंट के लिए बाद में देखें।
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
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
                        <Phone className="w-4 h-4" />
                        <span>{order.deliveryAddress.phone}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">डिलीवरी पता</h4>
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <div>
                          <p>{order.deliveryAddress.address}</p>
                          <p>
                            {order.deliveryAddress.city},{" "}
                            {order.deliveryAddress.pincode}
                          </p>
                          {order.deliveryAddress.landmark && (
                            <p className="text-xs">
                              लैंडमार्क: {order.deliveryAddress.landmark}
                            </p>
                          )}
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
                    size="sm"
                    onClick={() =>
                      window.open(`tel:${order.deliveryAddress.phone}`)
                    }
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    ग्राहक को कॉल करें
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(
                          `${order.deliveryAddress.address}, ${order.deliveryAddress.city}`
                        )}`
                      )
                    }
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    नेविगेट करें
                  </Button>
                  {nextStatus(order.status) && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusProgress(order)}
                      disabled={updateStatusMutation.isPending}
                    >
                      {nextStatusLabel(order.status)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* ─── OTP Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>डिलीवरी पूरी करें</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600 mb-4">
            डिलीवरी की पुष्टि करने के लिए ग्राहक से 4-अंकों का OTP माँगें।
          </div>
          {selectedOrder && (
            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <p className="font-medium">
                ऑर्डर #{selectedOrder.orderNumber}
              </p>
              <p className="text-sm text-gray-600">
                {selectedOrder.deliveryAddress.fullName}
              </p>
              <p className="text-sm text-gray-600">
                कुल: ₹{selectedOrder.total}
              </p>
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
              className="text-center text-lg tracking-widest"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleOtpConfirmation}
              disabled={
                handleOtpSubmit.isPending || otp.trim().length !== 4
              }
              className="flex-1"
            >
              {handleOtpSubmit.isPending ? "सत्यापित हो रहा है..." : "पुष्टि करें"}
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

// React Query Provider के साथ App को रैप करें
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeliveryDashboard />
    </QueryClientProvider>
  );
}
