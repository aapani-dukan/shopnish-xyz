
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';

interface CustomerAddress {
  address: string;
  city: string;
  pincode: string;
}

interface GoogleMapTrackerProps {
  deliveryBoyLocation?: { lat: number; lng: number };
  customerAddress: CustomerAddress;
}

const containerStyle = { width: '100%', height: '300px' };

const libraries: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'localContext'
  | 'visualization'
  | 'marker'
)[] = ['places', 'geometry', 'marker'];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 🏍️ Bike Icon
const BIKE_ICON: google.maps.Icon = {
  url: 'https://maps.google.com/mapfiles/kml/shapes/motorcycling.png',
  scaledSize: new google.maps.Size(40, 40),
};

// 🏠 Home Icon
const HOME_ICON: google.maps.Icon = {
  url: 'https://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png',
  scaledSize: new google.maps.Size(40, 40),
};

const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({
  deliveryBoyLocation,
  customerAddress,
}) => {
  const [currentLocation, setCurrentLocation] = useState(deliveryBoyLocation);
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // 🛰️ Step 1: Real-time GPS Tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(coords);
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  
const destination = useMemo(() => {
    if (!customerAddress) return "";
    
    if (customerAddress.lat && customerAddress.lng) {
        return { lat: customerAddress.lat, lng: customerAddress.lng }; 
    }
    
    return `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`;
  }, [customerAddress?.address, customerAddress?.city, customerAddress?.pincode, customerAddress?.lat, customerAddress?.lng]);
  
  const directionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null) => {
      if (response && response.status === 'OK') {
        setDirectionsResponse(response);
        const leg = response.routes[0].legs[0];
        if (leg?.distance?.text) {
          setDistance(leg.distance.text);
        }
      } else if (response) {
        console.error('Directions failed:', response.status);
      }
    },
    []
  );

  const mapOptions = {
    mapId: 'SHOPNISH_TRACKER_MAP',
    disableDefaultUI: false,
  };

  if (loadError) return <div>Error loading map</div>;
  if (!isLoaded) return <div>Loading map...</div>;
  if (!currentLocation) return <div>Getting your location...</div>;

  return (
    <div className="relative w-full h-[300px]">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation}
        zoom={14}
        options={mapOptions}
      >
        {currentLocation && destination && (
          <DirectionsService
            options={{
              origin: currentLocation,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            }}
            callback={directionsCallback}
          />
        )}

        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#2563eb',
                strokeWeight: 5,
              },
            }}
          />
        )}

        <MarkerF position={currentLocation} icon={BIKE_ICON} title="Delivery Partner" />
        {directionsResponse?.routes[0]?.legs[0]?.end_location && (
          <MarkerF
            position={directionsResponse.routes[0].legs[0].end_location}
            icon={HOME_ICON}
            title="Customer Location"
          />
        )}
      </GoogleMap>

      {/* 📏 Distance Info */}
      {distance && (
        <div className="absolute bottom-2 right-2 bg-white shadow-md rounded-lg px-3 py-1 text-sm font-medium text-gray-700">
          Distance: {distance}
        </div>
      )}
    </div>
  );
};

export default React.memo(GoogleMapTracker);


{/*
import React, { useState, useMemo, useCallback } from "react";
import {
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";

// ----------------------------
// ✅ Interfaces (Unchanged)
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
// ✅ Constants (Unchanged)
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
  // 🚀 FIX 1: Customer Location को पूरी तरह से स्थिर करें
  // ----------------------------
  const customerLatLng = useMemo(() => {
    // यह अब केवल customerAddress के lat/lng बदलने पर ही नया ऑब्जेक्ट बनाएगा
    const lat = customerAddress?.lat ?? 0;
    const lng = customerAddress?.lng ?? 0;
    return { lat, lng };
  }, [customerAddress?.lat, customerAddress?.lng]);

  // ----------------------------
  // 🚀 FIX 2: Map Center को डिलीवरी बॉय की लोकेशन से स्थिर करें
  // ----------------------------
  const mapCenter = useMemo(() => {
    // सेंटर हमेशा deliveryBoyLocation होगा यदि मौजूद है, अन्यथा customerLatLng
    return deliveryBoyLocation
      ? { lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng }
      : customerLatLng;
  }, [
    deliveryBoyLocation?.lat,
    deliveryBoyLocation?.lng,
    customerLatLng.lat,
    customerLatLng.lng,
  ]);

  // ----------------------------
  // 🚀 FIX 3: Destination को स्थिर करें
  // ----------------------------
  const destination = useMemo(() => {
    if (!customerAddress) return "";
    
    if (customerAddress.lat && customerAddress.lng) {
        return { lat: customerAddress.lat, lng: customerAddress.lng }; 
    }
    
    return `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`;
  }, [customerAddress?.address, customerAddress?.city, customerAddress?.pincode, customerAddress?.lat, customerAddress?.lng]);


  // ----------------------------
  // ✅ Directions Callback (Unchanged)
  // ----------------------------
  const directionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null) => {
      // DirectionsResponse को केवल तभी सेट करें जब यह DirectionsService से वापस आए
      if (response && response.status === "OK") {
        setDirectionsResponse(response);
      } else if (response) {
        console.error("Directions request failed:", response.status);
        // Error पर डायरेक्शन्स को हटाना भी स्थिरता में मदद कर सकता है
        if (directionsResponse) setDirectionsResponse(null); 
      }
    },
    [directionsResponse] // directionsResponse को dependency में शामिल करना उचित है
  );

  // ----------------------------
  // ✅ Marker Icons (Stateless and Unchanged)
  // ----------------------------
  const { bikeIcon, homeIcon } = useMemo(() => {
    // Note: मैंने यहाँ URL को स्थिर रखा है, लेकिन आपको इसे अपने Icon Paths से बदलना होगा।
    const bikeIcon = {
      url: "http://maps.google.com/mapfiles/kml/pal2/icon10.png", 
      scaledSize: { width: 32, height: 32 },
    };

    const homeIcon = {
      url: "http://maps.google.com/mapfiles/kml/pal2/icon3.png",
      scaledSize: { width: 32, height: 32 },
    };

    return { bikeIcon, homeIcon };
  }, []); 

  // ----------------------------
  // ✅ Load & Error Guards (Unchanged)
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
  // 🚀 FIX 4: Map Options को स्थिर करें
  // ----------------------------
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter, // mapCenter अब stable है
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
{/*    {deliveryBoyLocation && destination && (
        <DirectionsService
          options={{
            // location object में केवल lat/lng पास करें
            origin: { lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng }, 
            destination: destination, 
            travelMode: google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />
      )}

      {/* Directions Renderer */}
{/*   {directionsResponse && (
        <DirectionsRenderer
          options={{ directions: directionsResponse, suppressMarkers: true }}
        />
      )}

      {/* Delivery Boy Marker */}
{/*   <MarkerF
        position={{ lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng }}
        icon={bikeIcon}
        title="Delivery Partner"
      />

      {/* Customer Marker */}
{/*    <MarkerF
        position={customerLatLng}
        icon={homeIcon}
        title="Customer Location"
      />
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);

*/}
