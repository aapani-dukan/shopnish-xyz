import React, { useState, useMemo, useCallback } from "react";
import {
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";

// ----------------------------
// ✅ Interfaces
// ----------------------------
interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

interface DeliveryAddress {
  address: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

interface GoogleMapTrackerProps {
  deliveryBoyLocation: Location | null;
  customerAddress: DeliveryAddress | null;
}

// ----------------------------
// ✅ Constants
// ----------------------------
const containerStyle = { width: "100%", height: "320px" };

const libraries: (
  | "places"
  | "geometry"
  | "drawing"
  | "localContext"
  | "visualization"
  | "marker"
)[] = ["places", "geometry", "marker"];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ----------------------------
// ✅ Component
// ----------------------------
const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({
  deliveryBoyLocation,
  customerAddress,
}) => {
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // ----------------------------
  // ✅ Safe Fallback Logic
  // ----------------------------
  // यदि customerAddress में lat/lng है, तो उसका उपयोग करें, अन्यथा deliveryBoyLocation का उपयोग करें।
  const lat =
    customerAddress?.lat ??
    (deliveryBoyLocation ? deliveryBoyLocation.lat : 0);
  const lng =
    customerAddress?.lng ??
    (deliveryBoyLocation ? deliveryBoyLocation.lng : 0);

  const customerLatLng = { lat, lng };

  // ----------------------------
  // ✅ Map Center
  // ----------------------------
  const mapCenter = useMemo(
    () =>
      deliveryBoyLocation ?? {
        lat: customerLatLng.lat,
        lng: customerLatLng.lng,
        timestamp: "",
      },
    [deliveryBoyLocation, customerLatLng]
  );

  // ----------------------------
  // ✅ Destination (LatLng preferred)
  // ----------------------------
  const destination = useMemo(() => {
    if (!customerAddress) return "";
    
    // Note: यहाँ google.maps.LatLng का उपयोग तब सुरक्षित है जब कंपोनेंट रेंडर हो रहा हो,
    // क्योंकि यह useMemo के बाहर है।
    return customerAddress.lat && customerAddress.lng
      ? { lat: customerAddress.lat, lng: customerAddress.lng } // Simple LatLng object
      : `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`;
  }, [customerAddress]);

  // ----------------------------
  // ✅ Directions Callback
  // ----------------------------
  const directionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null) => {
      if (response && response.status === "OK") {
        setDirectionsResponse(response);
      } else if (response) {
        console.error("Directions request failed:", response.status);
      }
    },
    []
  );

  // ----------------------------
  // 🚀 FIX: Marker Icons (Simple Objects to avoid React Error #310)
  // ----------------------------
  const { bikeIcon, homeIcon } = useMemo(() => {
    // हम सीधे Google Maps कंस्ट्रक्टर (जैसे new maps.Size()) का उपयोग करने से बचते हैं
    // क्योंकि ये जटिल ऑब्जेक्ट्स React के इंटरनल स्टेट ट्रैकिंग को क्रैश करते हैं (Error #310).
    
    // Delivery Partner Icon (bike/motorcycle)
    const bikeIcon = {
      url: "https://maps.google.com/mapfiles/kml/pal2/icon2.png", // एक साधारण URL
      scaledSize: { width: 32, height: 32 }, // Simple object for size
      anchor: { x: 16, y: 16 }, // Simple object for anchor point
    };

    // Customer Location Icon (home)
    const homeIcon = {
      url: "https://maps.google.com/mapfiles/kml/pal4/icon54.png", // एक साधारण URL
      scaledSize: { width: 32, height: 32 },
      anchor: { x: 16, y: 32 },
    };

    return { bikeIcon, homeIcon };
  }, []); // isLoaded को dependency से हटा दिया क्योंकि ये केवल साधारण JS ऑब्जेक्ट हैं


  // ----------------------------
  // ✅ Map Load & Data Guards
  // ----------------------------
  if (loadError) {
    return <div>Google Maps failed to load: {String(loadError)}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }
  
  // Note: TrackOrder.tsx में पहले ही जाँच हो चुकी है, लेकिन यहाँ डबल-चेक ठीक है।
  if (!deliveryBoyLocation || !customerAddress) {
    return (
      <div className="w-full h-80 flex items-center justify-center text-gray-500 bg-gray-100">
        Delivery address or location information is missing.
      </div>
    );
  }

  // ----------------------------
  // ✅ Map Options
  // ----------------------------
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter,
      mapId: "SHOPNISH_TRACK_MAP",
      disableDefaultUI: false,
    }),
    [mapCenter]
  );

  // ----------------------------
  // ✅ Render Map
  // ----------------------------
  return (
    <GoogleMap mapContainerStyle={containerStyle} options={mapOptions}>
      {/* Directions Service */}
      {/* 🚀 FIX: Direction Service केवल तभी चलाएं जब mapCenter और deliveryBoyLocation दोनों मौजूद हों */}
      {deliveryBoyLocation && destination && (
        <DirectionsService
          options={{
            origin: deliveryBoyLocation,
            // सुनिश्चित करें कि डेस्टिनेशन केवल LatLng ऑब्जेक्ट या स्ट्रिंग है
            destination: destination as string | google.maps.LatLng, 
            travelMode: google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />
      )}

      {/* Directions Renderer */}
      {directionsResponse && (
        <DirectionsRenderer
          options={{ directions: directionsResponse, suppressMarkers: true }}
        />
      )}

      {/* Delivery Boy Marker */}
      {/* bikeIcon अब एक सुरक्षित सादा JS ऑब्जेक्ट है */}
      <MarkerF
        position={deliveryBoyLocation}
        icon={bikeIcon}
        title="Delivery Partner"
      />

      {/* Customer Marker */}
      {/* homeIcon अब एक सुरक्षित सादा JS ऑब्जेक्ट है */}
      <MarkerF
        position={customerLatLng}
        icon={homeIcon}
        title="Customer Location"
      />
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);
