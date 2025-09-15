// client/src/pages/DeliveryOrdersList.tsx
import React from "react";
import { Navigation, Phone, MapPin } from "lucide-react";

interface UIComponents {
  Button: React.FC<any>;
  Card: React.FC<any>;
  CardContent: React.FC<any>;
  CardHeader: React.FC<any>;
  CardTitle: React.FC<any>;
  Badge: React.FC<any>;
}

interface DeliveryOrdersListProps extends UIComponents {
  orders: any[];
  onAcceptOrder: (orderId: number) => void;
  onUpdateStatus: (order: any) => void;
  statusColor: (status: string) => string;
  statusText: (status: string) => string;
  nextStatus: (status: string) => string | null;
  nextStatusLabel: (status: string) => string;
  acceptLoading: boolean;
  updateLoading: boolean;
}

const DeliveryOrdersList: React.FC<DeliveryOrdersListProps> = ({
  orders,
  onAcceptOrder,
  onUpdateStatus,
  statusColor,
  statusText,
  nextStatus,
  nextStatusLabel,
  acceptLoading,
  updateLoading,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
}) => {
  if (!orders || orders.length === 0) return null;

  const renderOrderCard = (order: any) => {
  if (!order) return null;

  const addressData = order?.deliveryAddress ?? null;
  const isAddressObject = typeof addressData === "object" && addressData !== null;

  const sellerDetails = order?.sellerDetails ?? order?.items?.[0]?.product?.seller ?? null;
  const isSellerAddressObject = typeof sellerDetails === "object" && sellerDetails !== null;

  const canAccept = order.deliveryStatus === "pending";
  const isAssignedToMe = order.deliveryBoyId !== undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ऑर्डर #{order?.orderNumber ?? "N/A"}</CardTitle>
            <p className="text-sm text-gray-600">
              {order?.items?.length || 0} आइटम • ₹{order?.total ?? 0}
            </p>
          </div>
          <Badge className={`${statusColor(order?.status)} text-white`}>
            {statusText(order?.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">ग्राहक विवरण</h4>
                <p className="font-medium">{isAddressObject ? addressData?.fullName ?? "नाम उपलब्ध नहीं" : "नाम उपलब्ध नहीं"}</p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{isAddressObject ? addressData?.phone ?? "-" : "-"}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">डिलीवरी पता</h4>
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>{isAddressObject ? addressData?.address ?? "पता उपलब्ध नहीं" : "पता उपलब्ध नहीं"}</p>
                    {isAddressObject && (
                      <p>
                        {addressData?.city ?? ""}{" "}
                        {addressData?.pincode ? `, ${addressData?.pincode}` : ""}
                      </p>
                    )}
                    {isAddressObject && addressData?.landmark && (
                      <p className="text-xs">लैंडमार्क: {addressData?.landmark}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">विक्रेता विवरण</h4>
                <p className="font-medium">{isSellerAddressObject ? sellerDetails?.name ?? "नाम उपलब्ध नहीं" : "नाम उपलब्ध नहीं"}</p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{isSellerAddressObject ? sellerDetails?.phone ?? "-" : "-"}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">पिकअप पता</h4>
                <div className="flex items-start space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>{isSellerAddressObject ? sellerDetails?.address ?? "पता उपलब्ध नहीं" : "पता उपलब्ध नहीं"}</p>
                    {isSellerAddressObject && (
                      <p>
                        {sellerDetails?.city ?? ""}{" "}
                        {sellerDetails?.pincode ? `, ${sellerDetails?.pincode}` : ""}
                      </p>
                    )}
                    {isSellerAddressObject && sellerDetails?.landmark && (
                      <p className="text-xs">लैंडमार्क: {sellerDetails?.landmark}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium mb-2">ऑर्डर आइटम</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
              {order?.items?.map((item: any) => (
                <div key={item?.id ?? Math.random()} className="flex items-center space-x-3 text-sm">
                  <img
                    src={item?.product?.image || "https://placehold.co/32x32/E2E8F0/1A202C?text=No+Img"}
                    alt={item?.product?.name || "No Name"}
                    className="w-8 h-8 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item?.product?.name || "उत्पाद डेटा उपलब्ध नहीं"}</p>
                    <p className="text-gray-600">
                      मात्रा: {item?.quantity ?? 0} {item?.product?.unit ?? ""}
                    </p>
                  </div>
                </div>
              )) ?? <p className="text-sm text-gray-500">कोई आइटम नहीं</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
            {canAccept ? (
              <Button size="sm" onClick={() => onAcceptOrder(order.id)} disabled={acceptLoading}>
                ऑर्डर स्वीकार करें
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const query = encodeURIComponent(
                      `${isAddressObject ? addressData.address || "" : ""}, ${isAddressObject ? addressData.city || "" : ""}`
                    );
                    window.open(`http://google.com/maps/search/?api=1&query=${query}`, "_blank");
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें (ग्राहक)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${isAddressObject ? addressData.phone || "" : ""}`)}
                >
                  <Phone className="w-4 h-4 mr-2" /> ग्राहक को कॉल
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${isSellerAddressObject ? sellerDetails.phone || "" : ""}`)}
                >
                  <Phone className="w-4 h-4 mr-2" /> विक्रेता को कॉल
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const query = encodeURIComponent(
                      `${isSellerAddressObject ? sellerDetails.address || "" : ""}, ${isSellerAddressObject ? sellerDetails.city || "" : ""}`
                    );
                    window.open(`http://google.com/maps/search/?api=1&query=${query}`, "_blank");
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" /> नेविगेट करें (पिकअप)
                </Button>
                {nextStatus(order.status) && (
                  <Button size="sm" onClick={() => onUpdateStatus(order)} disabled={updateLoading}>
                    {nextStatusLabel(order.status)}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  <div className="space-y-4">
  {orders.map((order, i) => (
    <React.Fragment key={order?.id ?? i}>
      {renderOrderCard(order)}
    </React.Fragment>
  ))}
</div>

};

export default DeliveryOrdersList;
