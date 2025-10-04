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
  // ✅ Destination (LatLng preferred)
  // ----------------------------
  const destination = useMemo(() => {
    if (!customerAddress) return "";
    return customerAddress.lat && customerAddress.lng
      ? new google.maps.LatLng(customerAddress.lat, customerAddress.lng)
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
  // ✅ Icons (safe inside useMemo)
  // ----------------------------
  const { bikeIcon, homeIcon } = useMemo(() => {
    if (!(window as any).google?.maps)
      return { bikeIcon: undefined, homeIcon: undefined };

    const maps = (window as any).google.maps;

    const bikeIcon: google.maps.Icon = {
      url: "http://maps.google.com/mapfiles/ms/icons/cycling.png",
      scaledSize: new maps.Size(32, 32),
      anchor: new maps.Point(16, 16),
    };

    const homeIcon: google.maps.Icon = {
      url: "http://maps.google.com/mapfiles/ms/icons/home.png",
      scaledSize: new maps.Size(32, 32),
      anchor: new maps.Point(16, 32),
    };

    return { bikeIcon, homeIcon };
  }, [isLoaded]);

  // ----------------------------
  // ✅ Map Options
  // ----------------------------
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter,
      mapId: "SHOPNISH_TRACK_MAP", // custom map style के लिए optional
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
      {mapCenter && destination && (
        <DirectionsService
          options={{
            origin: deliveryBoyLocation,
            destination,
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
      {bikeIcon && (
        <MarkerF
          position={deliveryBoyLocation}
          icon={bikeIcon}
          title="Delivery Partner"
        />
      )}

      {/* Customer Marker */}
      {homeIcon && customerLatLng && (
        <MarkerF
          position={customerLatLng}
          icon={homeIcon}
          title="Customer Location"
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);
