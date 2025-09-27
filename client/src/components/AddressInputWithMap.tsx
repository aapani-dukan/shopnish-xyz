import React, { useRef, useState, useMemo, useCallback } from 'react';
import { StandaloneSearchBox, GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

// सुनिश्चित करें कि ये स्थिर (Static) परिभाषाएँ कंपोनेंट के बाहर हैं
const containerStyle = { width: '100%', height: '200px' };
const LIBRARIES = ['places'] as ('places')[]; 

// मान लें कि आपकी API Key आपके .env से आ रही है
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface AddressInputProps {
  // वर्तमान एड्रेस और कोऑर्डिनेट्स (Lat/Lng) को पैरेंट कंपोनेंट से लेना
  currentAddress: string;
  currentLocation: { lat: number; lng: number } | null;
  
  // अपडेटेड डेटा को पैरेंट कंपोनेंट को वापस भेजने का फंक्शन
  onLocationUpdate: (address: string, location: { lat: number; lng: number }) => void;
}

const AddressInputWithMap: React.FC<AddressInputProps> = ({
  currentAddress,
  currentLocation,
  onLocationUpdate,
}) => {
  
  // यह सुनिश्चित करता है कि Google Maps और Places API लोड हों
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  
  // मैप के केंद्र (center) के लिए एक default value
  const defaultCenter = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []); // India Center

  // मैप का center या तो मौजूदा लोकेशन होगा, या default इंडिया सेंटर
  const mapCenter = useMemo(() => currentLocation || defaultCenter, [currentLocation, defaultCenter]);

  // जब यूजर Autocomplete से कोई जगह चुनता है
  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const newLat = place.geometry?.location?.lat();
        const newLng = place.geometry?.location?.lng();
        const newAddress = place.formatted_address;

        if (newLat !== undefined && newLng !== undefined && newAddress) {
          // पैरेंट कंपोनेंट को अपडेटेड एड्रेस और Lat/Lng भेजें
          onLocationUpdate(newAddress, { lat: newLat, lng: newLng });
        }
      }
    }
  }, [onLocationUpdate]);

  // जब यूजर मैप पर मार्कर को ड्रैग करता है
  const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const newLat = e.latLng?.lat();
    const newLng = e.latLng?.lng();

    if (newLat !== undefined && newLng !== undefined) {
      // Reverse Geocoding API को कॉल करके Lat/Lng से एड्रेस प्राप्त करें
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const newAddress = results[0].formatted_address;
          onLocationUpdate(newAddress, { lat: newLat, lng: newLng });
        } else {
          // यदि Reverse Geocoding विफल रहता है, तो केवल Lat/Lng को अपडेट करें
          onLocationUpdate(currentAddress, { lat: newLat, lng: newLng });
        }
      });
    }
  }, [currentAddress, onLocationUpdate]);

  if (loadError) return <div>नक्शा लोड नहीं हो पाया। API कुंजी जाँचें।</div>;
  if (!isLoaded) return <div>लोकेशन लोडिंग...</div>;

  return (
    <div>
      {/* 1. Places Autocomplete इनपुट */}
      <StandaloneSearchBox
        onLoad={ref => searchBoxRef.current = ref}
        onPlacesChanged={onPlacesChanged}
      >
        <input
          type="text"
          placeholder="डिलीवरी एड्रेस खोजें या टाइप करें"
          value={currentAddress}
          onChange={(e) => onLocationUpdate(e.target.value, currentLocation || defaultCenter)} // केवल टेक्स्ट बदलने पर Lat/Lng को default पर सेट करें (ताकि मैप न टूटे)
          style={{
            boxSizing: `border-box`,
            border: `1px solid transparent`,
            width: `100%`,
            height: `40px`,
            padding: `0 12px`,
            borderRadius: `3px`,
            boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
            fontSize: `14px`,
            outline: `none`,
            textOverflow: `ellipses`,
          }}
        />
      </StandaloneSearchBox>

      {/* 2. इंटरैक्टिव मैप */}
      <div style={{ marginTop: '10px' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={15}
        >
          {currentLocation && (
            <MarkerF
              position={currentLocation}
              draggable={true} // यूजर को पिन ड्रैग करने की अनुमति दें
              onDragEnd={onMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>

      {/* 3. लाइव लोकेशन बटन (वैकल्पिक) */}
      <button
        type="button"
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Geocoding API का उपयोग करके एड्रेस प्राप्त करें
                const geocoder = new (window as any).google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
                    if (status === 'OK' && results[0]) {
                        onLocationUpdate(results[0].formatted_address, { lat, lng });
                    } else {
                        alert('आपके वर्तमान लोकेशन का पता नहीं लगा पाए।');
                    }
                });
              },
              (error) => {
                alert(`लोकेशन एक्सेस अस्वीकृत: ${error.message}`);
              }
            );
          } else {
            alert('आपके ब्राउज़र में जियोलोकेशन समर्थित नहीं है।');
          }
        }}
        style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        📍 मेरी वर्तमान लोकेशन का उपयोग करें
      </button>

      {/* 4. प्रदर्शित Lat/Lng (Debugging के लिए) */}
      {currentLocation && (
        <p style={{ fontSize: '12px', color: '#555' }}>
          Lat: {currentLocation.lat.toFixed(5)}, Lng: {currentLocation.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default AddressInputWithMap;
