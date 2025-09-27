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
)[] = ['places', 'geometry'];

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

  // ✅ Safe icon definitions (only after Google Maps is loaded)
  const bikeIcon: google.maps.Icon = {
    url: 'http://maps.google.com/mapfiles/ms/icons/cycling.png',
    scaledSize: new google.maps.Size(32, 32),
  };

  const homeIcon: google.maps.Icon = {
    url: 'http://maps.google.com/mapfiles/ms/icons/home.png',
    scaledSize: new google.maps.Size(32, 32),
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={15}
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
