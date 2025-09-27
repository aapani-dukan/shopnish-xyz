// src/components/GoogleMapTracker.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF, DirectionsService, DirectionsRenderer, LoadScript } from '@react-google-maps/api';

// आपके TrackOrder.tsx से Interfaces
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
  width: '100%',
  height: '320px'
};

const libraries: ("places" | "geometry" | "drawing" | "localContext" | "visualization")[] = ['geometry'];

// API Key को .env से प्राप्त करें (Vite projects में VITE_ prefix की आवश्यकता होती है)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const GoogleMapTracker: React.FC<GoogleMapTrackerProps> = ({ 
  deliveryBoyLocation, 
  customerAddress 
}) => {
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(deliveryBoyLocation);

  // गंतव्य पता स्ट्रिंग
  const destination = useMemo(() => 
    `${customerAddress.address}, ${customerAddress.city}, ${customerAddress.pincode}`, 
    [customerAddress]
  );
  
  // Directions API से रूट प्राप्त करने का Callback
  const directionsCallback = useCallback((response: google.maps.DirectionsResult | null) => {
    if (response !== null && response.status === 'OK') {
        setDirectionsResponse(response);
        // ETA और दूरी को डिस्प्ले करने के लिए आप यहाँ से डेटा निकाल सकते हैं
        const route = response.routes[0].legs[0];
        console.log(`ETA: ${route.duration?.text}, Distance: ${route.distance?.text}`);
    } else if (response !== null) {
        console.error('Directions request failed due to ' + response.status);
    }
  }, []);

  // मैप को डिलीवरी बॉय के स्थान पर केंद्रित रखें
  useEffect(() => {
    setMapCenter(deliveryBoyLocation);
  }, [deliveryBoyLocation]);


  // Custom Marker Icons
  

// ✅ फिक्स: आइकन परिभाषाओं को सरल बनाएं
const bikeIcon = useMemo(() => ({
    url: 'http://maps.google.com/mapfiles/ms/icons/cycling.png', // या आपकी custom URL
    scaledSize: { width: 32, height: 32 }, // MarkerF को सरल ऑब्जेक्ट चाहिए
    anchor: { x: 16, y: 16 }
}), []);


const homeIcon = useMemo(() => ({
    url: 'http://maps.google.com/mapfiles/ms/icons/home.png', // या आपकी custom URL
    scaledSize: { width: 32, height: 32 },
    anchor: { x: 16, y: 32 }
}), []);


  if (!GOOGLE_MAPS_API_KEY) {
      return <div>Google Maps API Key missing. Please check .env file.</div>;
  }

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={15}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {/* Directions Service: रूट कैलकुलेट करें */}
        <DirectionsService
          options={{
            origin: deliveryBoyLocation,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />

        {/* Directions Renderer: रूट को मैप पर दिखाएँ */}
        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse,
              suppressMarkers: true, // हम custom markers का उपयोग करेंगे
              polylineOptions: {
                strokeColor: '#7C3AED', 
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        )}
        
        {/* Delivery Boy Marker */}
        <MarkerF 
          position={deliveryBoyLocation}
          icon={bikeIcon}
          title="Delivery Partner"
        />

        {/* Customer Address Marker (गंतव्य) */}
        {directionsResponse && directionsResponse.routes[0]?.legs[0]?.end_location && (
            <MarkerF
                position={directionsResponse.routes[0].legs[0].end_location}
                icon={homeIcon}
                title="Your Location"
            />
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default React.memo(GoogleMapTracker);
