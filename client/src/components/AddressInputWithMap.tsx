// client/src/components/AddressInputWithMap.tsx

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { StandaloneSearchBox, GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '200px' };
const LIBRARIES = ['places'] as ('places')[];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface AddressInputProps {
  currentAddress: string;
  currentLocation: LatLngLiteral | null;
  onLocationUpdate: (address: string, location: LatLngLiteral) => void;
}

const AddressInputWithMap: React.FC<AddressInputProps> = ({
  currentAddress,
  currentLocation,
  onLocationUpdate,
}) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const defaultCenter = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []);
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(currentLocation || defaultCenter);

  useEffect(() => {
    if (currentLocation) {
      setMapCenter(currentLocation);
    }
  }, [currentLocation]);

  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const newLat = place.geometry?.location?.lat();
        const newLng = place.geometry?.location?.lng();
        const newAddress = place.formatted_address;

        if (newLat !== undefined && newLng !== undefined && newAddress) {
          const newLocation = { lat: newLat, lng: newLng };
          onLocationUpdate(newAddress, newLocation);
          setMapCenter(newLocation);
        }
      }
    }
  }, [onLocationUpdate]);

  const onMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const newLat = e.latLng?.lat();
      const newLng = e.latLng?.lng();

      if (newLat !== undefined && newLng !== undefined) {
        const newLocation = { lat: newLat, lng: newLng };

        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            onLocationUpdate(results[0].formatted_address, newLocation);
          } else {
            onLocationUpdate(currentAddress, newLocation);
          }
          setMapCenter(newLocation);
        });
      }
    },
    [currentAddress, onLocationUpdate]
  );

  const handleGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              onLocationUpdate(results[0].formatted_address, newLocation);
            } else {
              onLocationUpdate('Location found, but address could not be determined.', newLocation);
            }
            setMapCenter(newLocation);
          });
        },
        (error) => {
          alert(
            `📍 लोकेशन एक्सेस अस्वीकृत या विफल: ${error.message}. कृपया मैप पर मैन्युअल रूप से पिन करें।`
          );
        }
      );
    } else {
      alert('आपके ब्राउज़र में जियोलोकेशन समर्थित नहीं है।');
    }
  }, [onLocationUpdate]);

  if (loadError) return <div>नक्शा लोड नहीं हो पाया। API कुंजी जाँचें।</div>;
  if (!isLoaded) return <div>लोकेशन लोडिंग...</div>;

  return (
    <div>
      {/* 1. Places Autocomplete इनपुट */}
      <StandaloneSearchBox
        onLoad={(ref) => (searchBoxRef.current = ref)}
        onPlacesChanged={onPlacesChanged}
      >
        <input
          type="text"
          placeholder="डिलीवरी एड्रेस खोजें या टाइप करें"
          value={currentAddress}
          onChange={(e) => onLocationUpdate(e.target.value, currentLocation || mapCenter)}
          style={{
            boxSizing: 'border-box',
            border: '1px solid #ccc',
            width: '100%',
            height: '40px',
            padding: '0 12px',
            borderRadius: '4px',
            marginTop: '8px',
          }}
        />
      </StandaloneSearchBox>

      {/* 2. इंटरैक्टिव मैप */}
      <div style={{ marginTop: '10px' }}>
        <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={15}>
          {currentLocation && (
            <MarkerF position={currentLocation} draggable={true} onDragEnd={onMarkerDragEnd} />
          )}
        </GoogleMap>
      </div>

      {/* 3. लाइव लोकेशन बटन */}
      <button
        type="button"
        onClick={handleGeolocation}
        style={{
          marginTop: '10px',
          padding: '8px 15px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        📍 मेरी वर्तमान लोकेशन का उपयोग करें
      </button>

      {/* 4. Debug Lat/Lng */}
      {currentLocation && (
        <p style={{ fontSize: '12px', color: '#555' }}>
          Lat: {currentLocation.lat.toFixed(5)}, Lng: {currentLocation.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default AddressInputWithMap;
