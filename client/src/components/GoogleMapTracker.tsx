import React, { useState, useMemo, useCallback } from 'react';
import {
  GoogleMap,
  // ✅ इसे वापस MarkerF में बदलें
  MarkerF, 
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';

// ... (Interfaces, containerStyle) ...

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
