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
  // 🚀 FINAL FIX 1: Destination (Use simple {lat, lng} object or string)
  // ----------------------------
  const destination = useMemo(() => {
    if (!customerAddress) return "";
    
    // केवल सरल {lat, lng} ऑब्जेक्ट का उपयोग करें, google.maps.LatLng इंस्टेंस का नहीं।
    if (customerAddress.lat && customerAddress.lng) {
        return { lat: customerAddress.lat, lng: customerAddress.lng }; 
    }
    
    // अन्यथा, Address String का उपयोग करें।
    return `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`;
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
  // 🚀 FINAL FIX 2: Marker Icons (Simple Objects)
  // ----------------------------
  const { bikeIcon, homeIcon } = useMemo(() => {
    // Delivery Partner Icon (bike/motorcycle)
    const bikeIcon = {
      url: "https://maps.google.com/mapfiles/kml/pal2/icon2.png",
      scaledSize: { width: 32, height: 32 },
      anchor: { x: 16, y: 16 },
    };

    // Customer Location Icon (home)
    const homeIcon = {
      url: "https://maps.google.com/mapfiles/kml/pal4/icon54.png",
      scaledSize: { width: 32, height: 32 },
      anchor: { x: 16, y: 32 },
    };

    return { bikeIcon, homeIcon };
  }, []); // कोई dependency नहीं, क्योंकि वे स्थिर (static) सादे ऑब्जेक्ट हैं।


  // ----------------------------
  // ✅ Load & Error Guards
  // ----------------------------
  if (loadError) {
    return <div>Google Maps failed to load: {String(loadError)}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }

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
      {deliveryBoyLocation && destination && (
        <DirectionsService
          options={{
            origin: deliveryBoyLocation,
            destination: destination, // अब सुरक्षित (string या {lat, lng} ऑब्जेक्ट)
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
      <MarkerF
        position={deliveryBoyLocation}
        icon={bikeIcon}
        title="Delivery Partner"
      />

      {/* Customer Marker */}
      <MarkerF
        position={customerLatLng}
        icon={homeIcon}
        title="Customer Location"
      />
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);
