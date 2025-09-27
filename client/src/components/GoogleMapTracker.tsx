// src/components/GoogleMapTracker.tsx

import React, { useState, useMemo, useCallback } from "react";
import {
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
  LoadScript,
} from "@react-google-maps/api";

interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

interface DeliveryAddress {
  address: string;
  city: string;
  pincode: string;
}

interface GoogleMapTrackerProps {
  deliveryBoyLocation: Location;
  customerAddress: DeliveryAddress;
}

const containerStyle = {
  width: "100%",
  height: "320px",
};

const libraries: (
  | "places"
  | "geometry"
  | "drawing"
  | "localContext"
  | "visualization"
)[] = ["places", "geometry"];

// ✅ Custom Icons
const BIKE_ICON: google.maps.Icon = {
  url: "http://maps.google.com/mapfiles/ms/icons/cycling.png",
  scaledSize: new google.maps.Size(32, 32),
  anchor: new google.maps.Point(16, 16),
};

const HOME_ICON: google.maps.Icon = {
  url: "http://maps.google.com/mapfiles/ms/icons/home.png",
  scaledSize: new google.maps.Size(32, 32),
  anchor: new google.maps.Point(16, 32),
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({
  deliveryBoyLocation,
  customerAddress,
}) => {
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);

  // डिलीवरी बॉय की लोकेशन को ही हमेशा सेंटर रखें
  const mapCenter = useMemo(() => deliveryBoyLocation, [deliveryBoyLocation]);

  // Destination को Address string से तैयार करें
  const destination = useMemo(
    () =>
      `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`,
    [customerAddress]
  );

  // Directions API Callback
  const directionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null) => {
      if (response && response.status === "OK") {
        setDirectionsResponse(response);
        const route = response.routes[0].legs[0];
        console.log(
          `ETA: ${route.duration?.text}, Distance: ${route.distance?.text}`
        );
      } else if (response) {
        console.error("Directions request failed:", response.status);
      }
    },
    []
  );

  if (!GOOGLE_MAPS_API_KEY) {
    return <div>Google Maps API Key missing. Please check .env file.</div>;
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={15}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {/* Route निकालें */}
        <DirectionsService
          options={{
            origin: deliveryBoyLocation,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />

        {/* Route Render करें */}
        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#7C3AED",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        )}

        {/* Delivery Boy Marker */}
        <MarkerF
          position={deliveryBoyLocation}
          icon={BIKE_ICON}
          title="Delivery Partner"
        />

        {/* Customer Marker */}
        {directionsResponse?.routes?.[0]?.legs?.[0]?.end_location && (
          <MarkerF
            position={directionsResponse.routes[0].legs[0].end_location}
            icon={HOME_ICON}
            title="Customer Location"
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default React.memo(GoogleMapTracker);
