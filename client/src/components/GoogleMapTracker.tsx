import React, { useState, useMemo, useCallback } from 'react';
import {
  GoogleMap,
  // ✅ इसे वापस MarkerF में बदलें
  MarkerF, 
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '300px',
};
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
// ✅ 'marker' लाइब्रेरी को रखें
const libraries: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'localContext'
  | 'visualization'
  | 'marker' 
)[] = ['places', 'geometry', 'marker']; 

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 🛑 Icons को कंपोनेंट के बाहर सरल objects के रूप में परिभाषित करें (ReferenceError से बचने के लिए)
const BIKE_ICON = {
    url: 'http://maps.google.com/mapfiles/ms/icons/cycling.png', 
    scaledSize: { width: 32, height: 32 } as google.maps.Size, 
    anchor: { x: 16, y: 16 } as google.maps.Point
} as google.maps.Icon; 

const HOME_ICON = {
    url: 'http://maps.google.com/mapfiles/ms/icons/home.png', 
    scaledSize: { width: 32, height: 32 } as google.maps.Size,
    anchor: { x: 16, y: 32 } as google.maps.Point
} as google.maps.Icon; 


const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({
  deliveryBoyLocation,
  customerAddress,
}) => {
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const mapCenter = useMemo(() => deliveryBoyLocation, [deliveryBoyLocation]);

  const destination = useMemo(
    () =>
      `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`,
    [customerAddress]
  );

  const directionsCallback = useCallback(
    (response: google.maps.DirectionsResult | null) => {
      if (response && response.status === 'OK') {
        setDirectionsResponse(response);
      } else if (response) {
        console.error('Directions request failed:', response.status);
      }
    },
    []
  );
  
  // ✅ mapOptions में Map ID रखें
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter,
      mapId: 'DEMO_MAP_ID', // Map ID को Advanced/Legacy Markers दोनों के लिए रखें
    }),
    [mapCenter]
  );
  
  if (loadError) {
    return <div>Google Maps failed to load: {String(loadError)}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }
  
  // 🛑 यहाँ से पुरानी icon परिभाषाएं हटा दी गईं थी।

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      options={mapOptions} 
    >
      {/* Directions Service को सिर्फ तभी चलाएं जब data उपलब्ध हो */}
      {mapCenter && destination && (
          <DirectionsService
            options={{
              origin: mapCenter,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            }}
            callback={directionsCallback}
          />
      )}
      
      {directionsResponse && (
        <DirectionsRenderer
          options={{ directions: directionsResponse, suppressMarkers: true }}
        />
      )}
      
      {/* ✅ MarkerF का उपयोग करें और कंपोनेंट के बाहर परिभाषित स्थिर आइकन का उपयोग करें */}
      <MarkerF
        position={deliveryBoyLocation}
        icon={BIKE_ICON} // स्थिर आइकन का उपयोग
        title="Delivery Partner"
      />
      
      {directionsResponse?.routes?.[0]?.legs?.[0]?.end_location && (
        <MarkerF
          position={directionsResponse.routes[0].legs[0].end_location}
          icon={HOME_ICON} // स्थिर आइकन का उपयोग
          title="Customer Location"
        />
      )}
    </GoogleMap>
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
