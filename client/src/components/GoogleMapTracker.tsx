import React, { useState, useMemo, useCallback } from 'react';
import {
  GoogleMap,
  // 🛑 MarkerF को AdvancedMarkerF से बदलें
  AdvancedMarkerF,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
  // 💡 PinElementF को भी import कर सकते हैं यदि आप default pins को customize करना चाहते हैं
} from '@react-google-maps/api';

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

const containerStyle = { width: '100%', height: '320px' };

// ✅ 1. 'marker' लाइब्रेरी जोड़ी गई
const libraries: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'localContext'
  | 'visualization'
  | 'marker' // <-- NEW!
)[] = ['places', 'geometry', 'marker']; // 'marker' library is necessary for Advanced Markers

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
  
  // ✅ 2. mapOptions में Map ID जोड़ी गई (Advanced Markers के लिए आवश्यक)
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter,
      // Advanced Markers के लिए mapId आवश्यक है।
      // आपको अपने Google Cloud Console से एक Map ID प्राप्त करनी होगी।
      mapId: 'DEMO_MAP_ID', // Testing के लिए 'DEMO_MAP_ID' का उपयोग करें, Production के लिए अपनी ID डालें
    }),
    [mapCenter]
  );
  
  if (loadError) {
    return <div>Google Maps failed to load: {String(loadError)}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }
  
  // 🛑 पुराने google.maps.Size का उपयोग अब Advanced Markers के लिए आवश्यक नहीं है, 
  // और यह MarkerF के लिए ReferenceError का कारण बन सकता था।
  // Advanced Markers के लिए हम MarkerF/AdvancedMarkerF कंपोनेंट में सीधे
  // custom content या PinElementF का उपयोग कर सकते हैं।
  // चूंकि AdvancedMarkerF को default में एक advanced pin मिल जाता है, हम 'icon' prop को हटा सकते हैं।

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      options={mapOptions} // Updated to use mapOptions
    >
      {/* Directions Service को सिर्फ तब चलाएं जब data उपलब्ध हो */}
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
      
      {/* 🛑 MarkerF को AdvancedMarkerF से बदलें */}
      <AdvancedMarkerF
        position={deliveryBoyLocation}
        // icon prop हटा दिया गया है, क्योंकि Advanced Marker को icon नहीं, बल्कि content prop की आवश्यकता होती है।
        // Default Advanced Marker Pin का उपयोग होगा।
        title="Delivery Partner"
      />
      
      {directionsResponse?.routes?.[0]?.legs?.[0]?.end_location && (
        // 🛑 MarkerF को AdvancedMarkerF से बदलें
        <AdvancedMarkerF
          position={directionsResponse.routes[0].legs[0].end_location}
          // Default Advanced Marker Pin का उपयोग होगा।
          title="Customer Location"
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);
