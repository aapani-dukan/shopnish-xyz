import React, { useState, useMemo, useCallback } from 'react';
import {
  
  GoogleMap,
  MarkerF,
  DirectionsService,
  DirectionsRenderer,
  useJsApiLoader,
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
const libraries: (
  | 'places'
  | 'geometry'
  | 'drawing'
  | 'localContext'
  | 'visualization'
  | 'marker' // Advanced Marker या MapId के लिए इसे रखें
)[] = ['places', 'geometry', 'marker'];

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

  if (loadError) {
    return <div>Google Maps failed to load: {String(loadError)}</div>;
  }

  if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }

    if (!isLoaded) {
    return <div>Loading Google Maps…</div>;
  }
  
  // ✅ आइकन परिभाषाओं को useMemo में मूव करें
  const { bikeIcon, homeIcon } = useMemo(() => {
    // TypeScript के लिए window.google.maps को एक्सेस करने का सुरक्षित तरीका
    const maps = (window as any).google.maps; 

    const bikeIcon: google.maps.Icon = {
        url: 'http://maps.google.com/mapfiles/kml/shapes/motorcycling.png', 
        scaledSize: new maps.Size(32, 32), // new maps.Size का उपयोग करें
        anchor: new maps.Point(16, 16),
    }; 

    const homeIcon: google.maps.Icon = {
        url: 'http://maps.google.com/mapfiles/kml/shapes/homegarden.png', 
        scaledSize: new maps.Size(32, 32),
        anchor: new maps.Point(16, 32),
    };
    return { bikeIcon, homeIcon };
  }, [isLoaded]); // isLoaded पर निर्भरता जरूरी है

  // ✅ Map Options में Map ID जोड़ें (यदि आप advanced marker library का उपयोग कर रहे हैं)
  const mapOptions = useMemo(
    () => ({
      zoom: 15,
      center: mapCenter,
      mapId: 'DEMO_MAP_ID', // आपको अपनी ID यहाँ डालनी होगी
    }),
    [mapCenter]
  );


  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      options={mapOptions} // mapOptions का उपयोग करें
    >
      <DirectionsService
        options={{
          origin: deliveryBoyLocation,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        }}
        callback={directionsCallback}
      />
      {directionsResponse && (
        <DirectionsRenderer
          options={{ directions: directionsResponse, suppressMarkers: true }}
        />
      )}
         {/* मार्कर का उपयोग */}
      <MarkerF
        position={deliveryBoyLocation}
        icon={bikeIcon}
        title="Delivery Partner"
      />
      {directionsResponse?.routes?.[0]?.legs?.[0]?.end_location && (
        <MarkerF
          position={directionsResponse.routes[0].legs[0].end_location}
          icon={homeIcon}
          title="Customer Location"
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(GoogleMapTracker);
