// client/src/pages/DeliveryOrdersList.tsx
import React from "react";
import { Navigation, Phone, MapPin } from "lucide-react";

// --- TypeScript Type Definitions ---
export interface Address {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
}

export interface Seller {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
}

export interface Product {
  name?: string;
  image?: string;
  unit?: string;
}

export interface OrderItem {
  id: number;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: number;
  orderNumber?: string;
  total?: string;
  items?: OrderItem[];
  deliveryStatus?: string;
  status?: string; 
  deliveryAddress?: Address;
  sellerDetails?: Seller;
  deliveryBoyId?: number;
}

// UI components (assuming they are passed as props from the parent)
export interface UIComponents {
  Button: React.FC<any>;
  Card: React.FC<any>;
  CardContent: React.FC<any>;
  CardHeader: React.FC<any>;
  CardTitle: React.FC<any>;
  Badge: React.FC<any>;
}

export interface DeliveryOrdersListProps extends UIComponents {
  orders: Order[];
  onAcceptOrder: (orderId: number) => void;
  onUpdateStatus: (order: Order) => void;
  statusColor: (status: string) => string;
  statusText: (status: string) => string;
  nextStatus: (status: string) => string | null;
  nextStatusLabel: (status: string) => string;
  acceptLoading: boolean;
  updateLoading: boolean;
}

// --- Sub-Component: AddressBlock ---
const AddressBlock: React.FC<{
  title: string;
  details: Address | Seller | null;
  Button: UIComponents["Button"];
}> = ({ title, details, Button }) => {
  if (!details) return null;

  const address = details.address || "पता उपलब्ध नहीं";
  const city = details.city || "";
  const pincode = details.pincode ? `, ${details.pincode}` : "";
  const fullAddress = `${address}, ${city}${pincode}`;

  const handleNavigate = () => {
    const query = encodeURIComponent(fullAddress);
    // Corrected Google Maps URL
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleCall = () => {
    if (details.phone) window.open(`tel:${details.phone}`);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">{title}</h4>
      <p className="font-medium">{(details as Address).fullName || (details as Seller).name || "नाम उपलब्ध नहीं"}</p>
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Phone className="w-4 h-4" />
        <span>{details.phone || "-"}</span>
      </div>
      <div className="flex items-start space-x-2 text-sm text-gray-600">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p>{address}</p>
          <p>{city}{pincode}</p>
          {details.landmark && <p className="text-xs">लैंडमार्क: {details.landmark}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
         <Button variant="outline" size="sm" onClick={handleNavigate}>
           <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें
         </Button>
         <Button variant="outline" size="sm" onClick={handleCall} disabled={!details.phone}>
           <Phone className="w-4 h-4 mr-2" /> कॉल करें
         </Button>
      </div>
    </div>
  );
};

// --- Sub-Component: OrderItems ---
const OrderItems: React.FC<{ items: OrderItem[] }> = ({ items }) => (
  <div className="mt-6 pt-4 border-t">
    <h4 className="font-medium mb-2">ऑर्डर आइटम</h4>
    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
      {items.length > 0 ? (
        items.map((item) => (
          <div key={item.id} className="flex items-center space-x-3 text-sm">
            <img
              src={item.product?.image || "https://placehold.co/32x32/E2E8F0/1A202C?text=No+Img"}
              alt={item.product?.name || "No Name"}
              className="w-8 h-8 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{item.product?.name || "उत्पाद डेटा उपलब्ध नहीं"}</p>
              <p className="text-gray-600">
                मात्रा: {item.quantity || 0} {item.product?.unit || ""}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500">कोई आइटम नहीं</p>
      )}
    </div>
  </div>
);

// --- Sub-Component: OrderCard ---
const OrderCard: React.FC<Omit<DeliveryOrdersListProps, 'orders' | 'acceptLoading' | 'updateLoading'> & { order: Order; isLoading: boolean }> = React.memo(({ order, onAcceptOrder, onUpdateStatus, statusColor, statusText, nextStatus, nextStatusLabel, isLoading, ...ui }) => {
  if (!order) return null;

  // ✅ FIX: Use 'status' column for display, 'deliveryStatus' for logic
  const mainStatus = order.status || "";
  const deliveryStatus = order.deliveryStatus || "";
  const canAccept = deliveryStatus === "pending";
  
  // ✅ FIX: Use nextStatus based on the main 'status'
  const hasNextAction = !!nextStatus(mainStatus);

  return (
    <ui.Card>
      <ui.CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <ui.CardTitle>ऑर्डर #{order.orderNumber ?? "N/A"}</ui.CardTitle>
            <p className="text-sm text-gray-600">{order.items?.length || 0} आइटम • ₹{order.total || 0}</p>
          </div>
          {/* ✅ FIX: Display main 'status' on the badge */}
          <ui.Badge className={`${statusColor(mainStatus)} text-white`}>{statusText(mainStatus)}</ui.Badge>
        </div>
      </ui.CardHeader>
      <ui.CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AddressBlock title="ग्राहक विवरण" details={order.deliveryAddress ?? null} Button={ui.Button} />
          <AddressBlock title="विक्रेता विवरण" details={order.sellerDetails ?? null} Button={ui.Button} />
        </div>
        
        <OrderItems items={order.items ?? []} />

        <div className="mt-6 pt-4 border-t">
          {canAccept && (
            // ✅ FIX: Show accept button only for available orders
            <ui.Button size="sm" onClick={() => onAcceptOrder(order.id)} disabled={isLoading}>
              ऑर्डर स्वीकार करें
            </ui.Button>
          )}

          {/* ✅ FIX: Show status update button only for assigned orders */}
          {!canAccept && hasNextAction && (
             <ui.Button size="sm" onClick={() => onUpdateStatus(order)} disabled={isLoading}>
               {nextStatusLabel(mainStatus)}
             </ui.Button>
          )}
        </div>
      </ui.CardContent>
    </ui.Card>
  );
});

// --- Main Component: DeliveryOrdersList ---
const DeliveryOrdersList: React.FC<DeliveryOrdersListProps> = ({ orders, ...props }) => {
  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isLoading={props.acceptLoading || props.updateLoading}
          {...props}
        />
      ))}
    </div>
  );
};

export default React.memo(DeliveryOrdersList);

