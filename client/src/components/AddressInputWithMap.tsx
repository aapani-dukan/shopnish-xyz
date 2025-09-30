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

// ✅ NEW INTERFACE: अब इसमें city और pincode भी होंगे
interface GeocodedLocation extends LatLngLiteral {
  city: string;
  pincode: string;
}

interface AddressInputProps {
  currentAddress: string;
  currentLocation: LatLngLiteral | null;
  // ✅ UPDATED PROP: अब onLocationUpdate पूरा GeocodedLocation ऑब्जेक्ट लेगा
  onLocationUpdate: (address: string, location: GeocodedLocation) => void;
}

// =========================================================================
// ✅ HELPER FUNCTION: Geocoder Results से City और Pincode निकालता है
// =========================================================================
const extractCityAndPincode = (results: any) => {
    let city = '';
    let pincode = '';
    
    if (results && results[0] && results[0].address_components) {
        results[0].address_components.forEach((component: any) => {
            // Pincode को 'postal_code' से निकालें
            if (component.types.includes('postal_code')) {
                pincode = component.long_name;
            }
            
            // City के लिए कई प्रकार की जाँच करें (locality सबसे आम है)
            if (component.types.includes('locality')) {
                if (!city) city = component.long_name;
            }
            // यदि locality नहीं है, तो administrative_area_level_2 (जिला) को देखें
            if (component.types.includes('administrative_area_level_2')) {
                if (!city) city = component.long_name;
            }
        });
    }
    // यदि कुछ भी न मिले, तो खाली स्ट्रिंग लौटाएँ
    return { city: city || '', pincode: pincode || '' }; 
};
// =========================================================================

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

  // Default center set to India center
  const defaultCenter = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []); 
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(currentLocation || defaultCenter);

  useEffect(() => {
    if (currentLocation) {
      setMapCenter(currentLocation);
    }
  }, [currentLocation]);

  // =========================================================================
  // 1. Places Changed (Search Box)
  // =========================================================================
  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const newLat = place.geometry?.location?.lat();
        const newLng = place.geometry?.location?.lng();
        const newAddress = place.formatted_address;

        if (newLat !== undefined && newLng !== undefined && newAddress) {
          const newLocation: LatLngLiteral = { lat: newLat, lng: newLng };
          
          // ✅ FIX: Reverse Geocode to get City/Pincode
          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                const { city, pincode } = extractCityAndPincode(results); 
                const updatedLocation: GeocodedLocation = { ...newLocation, city, pincode };
                
                // Address: Places API formatted_address का उपयोग करें क्योंकि यह अक्सर बेहतर होता है
                onLocationUpdate(newAddress, updatedLocation); 
            } else {
                // Geocoder विफल होने पर भी खाली Pincode/City भेजें
                const updatedLocation: GeocodedLocation = { ...newLocation, city: '', pincode: '' };
                onLocationUpdate(newAddress, updatedLocation);
            }
            setMapCenter(newLocation);
          });
        }
      }
    }
  }, [onLocationUpdate]);

  // =========================================================================
  // 2. Marker Drag End
  // =========================================================================
  const onMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const newLat = e.latLng?.lat();
      const newLng = e.latLng?.lng();

      if (newLat !== undefined && newLng !== undefined) {
        const newLocation: LatLngLiteral = { lat: newLat, lng: newLng };

        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const { city, pincode } = extractCityAndPincode(results);
            const updatedLocation: GeocodedLocation = { ...newLocation, city, pincode };
            
            // ✅ FIX: Pincode/City भेजें
            onLocationUpdate(results[0].formatted_address, updatedLocation); 
          } else {
            // विफल होने पर भी खाली Pincode/City भेजें
            const updatedLocation: GeocodedLocation = { ...newLocation, city: '', pincode: '' };
            onLocationUpdate(currentAddress, updatedLocation); 
          }
          setMapCenter(newLocation);
        });
      }
    },
    [currentAddress, onLocationUpdate]
  );

  // =========================================================================
  // 3. Handle Geolocation (Current Location Button)
  // =========================================================================
  const handleGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: LatLngLiteral = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          const geocoder = new (window as any).google.maps.Geocoder();
          geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              const { city, pincode } = extractCityAndPincode(results);
              const updatedLocation: GeocodedLocation = { ...newLocation, city, pincode };
              
              // ✅ FIX: Pincode/City भेजें
              onLocationUpdate(results[0].formatted_address, updatedLocation); 
            } else {
              // विफल होने पर भी खाली Pincode/City भेजें
              const updatedLocation: GeocodedLocation = { ...newLocation, city: '', pincode: '' };
              onLocationUpdate('Location found, but address could not be determined.', updatedLocation);
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
          onChange={(e) => onLocationUpdate(e.target.value, currentLocation ? { ...currentLocation, city: '', pincode: '' } : { lat: mapCenter.lat, lng: mapCenter.lng, city: '', pincode: '' })}
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
