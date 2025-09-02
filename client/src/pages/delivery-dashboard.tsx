import React, { useEffect, useState } from "react";
// Firebase Core App and Auth imports
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
// Firebase Firestore imports
import { getFirestore, doc, updateDoc, onSnapshot, collection, query, where, setLogLevel, addDoc } from 'firebase/firestore';

// ग्लोबल वेरिएबल्स, ये runtime में उपलब्ध हैं
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';

/* -------------------------------------------------------------------------- */
/* UI Components (Simple, inline for single-file example)                    */
/* -------------------------------------------------------------------------- */
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
/* Helper Functions                                                          */
/* -------------------------------------------------------------------------- */
const statusColor = (status) => {
  switch (status) {
    case "pending": return "bg-yellow-500";
    case "accepted": return "bg-blue-500";
    case "picked_up": return "bg-purple-500";
    case "delivered": return "bg-green-500";
    default: return "bg-gray-500";
  }
};

const statusText = (status) => {
  switch (status) {
    case "pending": return "उपलब्ध";
    case "accepted": return "स्वीकृत";
    case "picked_up": return "उठाया गया";
    case "delivered": return "डिलीवर किया गया";
    default: return status;
  }
};

const nextStatus = (status) => {
  switch (status) {
    case "pending": return "accepted";
    case "accepted": return "picked_up";
    case "picked_up": return "delivered";
    default: return null;
  }
};

const nextStatusLabel = (status) => {
  switch (status) {
    case "pending": return "स्वीकार करें";
    case "accepted": return "उठाया गया";
    case "picked_up": return "डिलीवर किया गया";
    default: return "";
  }
};

/* -------------------------------------------------------------------------- */
/* Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function App() {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingOrder, setAddingOrder] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false, isError: false });

  // Toast संदेश दिखाने के लिए function
  const showToast = (message, isError = false) => {
    setToast({ message, visible: true, isError });
    setTimeout(() => {
      setToast({ message: '', visible: false, isError: false });
    }, 3000);
  };

  useEffect(() => {
    // Firestore में लॉगिंग चालू करें
    setLogLevel('debug');
    
    let app, authInstance, dbInstance;
    try {
        // यह सुनिश्चित करने के लिए कि Firebase केवल एक बार शुरू हो
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        }
        
        authInstance = getAuth();
        dbInstance = getFirestore();

        setDb(dbInstance);

        // Auth state बदलने पर listener सेट करें
        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            // अगर user logged out है तो anonymously sign in करें
            await signInAnonymously(authInstance);
            setUserId(authInstance.currentUser.uid);
          }
          setLoading(false);
        });

        return () => unsubscribe();
    } catch (error) {
        console.error("Firebase initialization error: ", error);
        showToast('Firebase से जुड़ने में त्रुटि।', true);
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (db && userId) {
      // उपलब्ध ऑर्डरों के लिए real-time listener
      const availableOrdersQuery = query(
        collection(db, `artifacts/${appId}/public/data/orders`),
        where("status", "==", "pending")
      );

      const unsubscribeAvailable = onSnapshot(availableOrdersQuery, (snapshot) => {
        const ordersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAvailableOrders(ordersList);
      }, (error) => {
        console.error("Error fetching available orders:", error);
        showToast('उपलब्ध ऑर्डर लाने में त्रुटि।', true);
      });

      // मेरे ऑर्डरों के लिए real-time listener
      const myOrdersQuery = query(
        collection(db, `artifacts/${appId}/public/data/orders`),
        where("acceptedBy", "==", userId)
      );

      const unsubscribeMyOrders = onSnapshot(myOrdersQuery, (snapshot) => {
        const ordersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMyOrders(ordersList);
      }, (error) => {
        console.error("Error fetching my orders:", error);
        showToast('आपके ऑर्डर लाने में त्रुटि।', true);
      });

      return () => {
        unsubscribeAvailable();
        unsubscribeMyOrders();
      };
    }
  }, [db, userId, appId]);

  const addTestOrder = async () => {
    setAddingOrder(true);
    try {
      const orderData = {
        orderNumber: 'ORD' + Date.now().toString().substring(4, 12),
        total: Math.floor(Math.random() * 500) + 100,
        paymentMethod: 'Cash',
        status: 'pending',
        deliveryAddress: {
          fullName: 'अमित शर्मा',
          phone: '9876543210',
          address: 'G-12, Sector 5, Vashi',
          city: 'Mumbai',
          pincode: '400703'
        },
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, `artifacts/${appId}/public/data/orders`), orderData);
      showToast('टेस्ट ऑर्डर सफलतापूर्वक जोड़ा गया!');
    } catch (error) {
      console.error("Error adding test order: ", error);
      showToast('टेस्ट ऑर्डर जोड़ने में त्रुटि।', true);
    } finally {
      setAddingOrder(false);
    }
  };

  // ऑर्डर की स्थिति अपडेट करने के लिए handler
  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const orderRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);
      const updates = { status: newStatus };

      if (newStatus === 'accepted') {
        updates.acceptedBy = userId;
        updates.acceptanceTime = new Date().toISOString();
      } else if (newStatus === 'picked_up') {
        updates.pickupTime = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.deliveryTime = new Date().toISOString();
      }
      await updateDoc(orderRef, updates);
      showToast(`ऑर्डर की स्थिति सफलतापूर्वक '${statusText(newStatus)}' में अपडेट हो गई है!`);
    } catch (error) {
      console.error("Error updating order status: ", error);
      showToast('ऑर्डर अपडेट करने में त्रुटि।', true);
    } finally {
      setUpdating(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!selectedOrder) return;
    if (otp.trim().length !== 4) {
      showToast("OTP 4-अंकीय होना चाहिए।", true);
      return;
    }
    // वास्तविक OTP validation लॉजिक यहाँ होना चाहिए
    // अभी के लिए हम मान रहे हैं कि यह सही है
    await handleStatusUpdate(selectedOrder.id, 'delivered');
    setOtpDialogOpen(false);
    setSelectedOrder(null);
    setOtp("");
  };

  const renderOrderList = (orders, title) => (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">{title}</h2>
      <div className="space-y-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Icons.Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">कोई ऑर्डर नहीं</h3>
              <p>अभी कोई ऑर्डर उपलब्ध नहीं है।</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ऑर्डर #{order.orderNumber.substring(4, 12)}</CardTitle>
                    <p className="text-sm text-gray-600">
                      ₹{order.total} • {order.paymentMethod}
                    </p>
                  </div>
                  <Badge className={`${statusColor(order.status)} text-white`}>
                    {statusText(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800">ग्राहक विवरण</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Icons.User className="w-4 h-4" />
                      <p>{order.deliveryAddress.fullName}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Icons.Phone className="w-4 h-4" />
                      <p>{order.deliveryAddress.phone}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">डिलीवरी पता</h4>
                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                      <Icons.MapPin className="w-4 h-4 mt-1" />
                      <div>
                        <p>{order.deliveryAddress.address}</p>
                        <p>{order.deliveryAddress.city}, {order.deliveryAddress.pincode}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
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
                  {order.status !== 'delivered' && (
                    <Button
                      onClick={() => {
                        if (order.status === 'picked_up') {
                          setSelectedOrder(order);
                          setOtpDialogOpen(true);
                        } else {
                          handleStatusUpdate(order.id, nextStatus(order.status));
                        }
                      }}
                      disabled={updating}
                    >
                      {nextStatusLabel(order.status)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500">लोड हो रहा है...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter text-gray-800">
      <header className="bg-white p-6 shadow-md rounded-b-3xl text-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-blue-600">डिलीवरी पार्टनर डैशबोर्ड</h1>
        <div className="mt-2 text-sm text-gray-600">
          <p>यूजर ID: <span className="font-mono text-xs break-all">{userId}</span></p>
        </div>
      </header>

      <main className="p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={addTestOrder} disabled={addingOrder}>
            <Icons.Plus className="w-5 h-5 mr-2" />
            टेस्ट ऑर्डर जोड़ें
          </Button>
        </div>
        {renderOrderList(availableOrders, "नए ऑर्डर")}
        {renderOrderList(myOrders, "मेरे स्वीकृत ऑर्डर")}
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-white shadow-lg transition-all duration-300 transform ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ${toast.isError ? 'bg-red-500' : 'bg-green-500'}`}>
        {toast.message}
      </div>

      {/* OTP Dialog */}
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
              disabled={updating || otp.trim().length !== 4}
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
 
