import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { StandaloneSearchBox, GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

// सुनिश्चित करें कि ये स्थिर (Static) परिभाषाएँ कंपोनेंट के बाहर हैं
const containerStyle = { width: '100%', height: '200px' };
const LIBRARIES = ['places'] as ('places')[]; 
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface LatLngLiteral { lat: number; lng: number }

interface AddressInputProps {
  currentAddress: string;
  currentLocation: LatLngLiteral | null; // सुनिश्चित करें कि यह LatLngLiteral या null है
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
  
  // ✅ NEW: Bundi/Jaipur के बजाय India Center को ही Fallback रखें 
  const defaultCenter = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []); 
  
  // ✅ NEW STATE: mapCenter को लोकल स्टेट में रखें
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(currentLocation || defaultCenter);

  // ✅ EFFECT: जब currentLocation बदलता है (यानी Bundi/Jaipur निर्देशांक सेट हैं), तो मैप को वहां ले जाएं
  useEffect(() => {
      if (currentLocation) {
          setMapCenter(currentLocation);
      }
      // यह useEffect सुनिश्चित करता है कि जब Checkout2.tsx से Bundi के निर्देशांक आते हैं, 
      // तो मैप वहीं केंद्रित होता है।
  }, [currentLocation]);

  // **********************************
  // * Autocomplete और Dragging लॉजिक *
  // **********************************

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
          setMapCenter(newLocation); // ✅ मैप सेंटर को तुरंत अपडेट करें
        }
      }
    }
  }, [onLocationUpdate]);

  // AddressInputWithMap.tsx
const onMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    const newLat = e.latLng?.lat();
    const newLng = e.latLng?.lng();

    if (newLat !== undefined && newLng !== undefined) {
        const newLocation = { lat: newLat, lng: newLng };
        
        // Reverse Geocoding API को कॉल करके Lat/Lng से एड्रेस प्राप्त करें
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                // ✅ FIX 1: सफलतापूर्वक पता मिलने पर, इसे onLocationUpdate में भेजें
                onLocationUpdate(results[0].formatted_address, newLocation); 
            } else {
                // यदि Reverse Geocoding विफल रहता है, तो पुराने एड्रेस के साथ Lat/Lng को अपडेट करें
                // (या आप एक डिफ़ॉल्ट संदेश 'Unknown Address' भेज सकते हैं)
                onLocationUpdate(currentAddress, newLocation); 
            }
            setMapCenter(newLocation); 
        });
    }
}, [currentAddress, onLocationUpdate]);
  

  // **********************************
  // * Geolocation Logic *
  // **********************************
  
  const handleGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
        const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };
        
        // Geocoding API का उपयोग करके एड्रेस प्राप्त करें
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
                // ✅ FIX 2: सफलतापूर्वक पता मिलने पर, इसे onLocationUpdate में भेजें
                onLocationUpdate(results[0].formatted_address, newLocation);
            } else {
                // अगर Geocoding विफल हो जाए, तो यूज़र को अलर्ट दें
                onLocationUpdate("Location found, but address could not be determined.", newLocation);
            }
            setMapCenter(newLocation);
        });
    },
        (error) => {
          // यहाँ वह एरर आती है जो आप देख रहे थे ("आपकी लोकेशन का पता नहीं लगा पा रहे")
          alert(`📍 लोकेशन एक्सेस अस्वीकृत या विफल: ${error.message}. कृपया मैप पर मैन्युअल रूप से पिन करें।`);
          // Geolocation विफल होने पर mapCenter को नहीं बदलें।
        }
      );
    } else {
      alert('आपके ब्राउज़र में जियोलोकेशन समर्थित नहीं है।');
    }
  }, [currentAddress, onLocationUpdate]);

  // **********************************
  // * Render Logic *
  // **********************************

  if (loadError) return <div>नक्शा लोड नहीं हो पाया। API कुंजी जाँचें।</div>;
  // ✅ NEW: Bundi के निर्देशांक मिलने तक 'लोकेशन लोडिंग...' दिखाएं
  if (!isLoaded || (!currentLocation && !mapCenter)) return <div>लोकेशन लोडिंग...</div>; 

  return (
    <div>
      {/* 1. Places Autocomplete इनपुट */}
      <StandaloneSearchBox
        onLoad={ref => searchBoxRef.current = ref}
        onPlacesChanged={onPlacesChanged}
      >
      // AddressInputWithMap.tsx (लगभग लाइन 212)

<input
  type="text"
  placeholder="डिलीवरी एड्रेस खोजें या टाइप करें"
  value={currentAddress}
  // ❌ पहले का लूप बनाने वाला कोड: 
  // onChange={(e) => onLocationUpdate(e.target.value, currentLocation || defaultCenter)} 
  
  // ✅ FIX: केवल Address टेक्स्ट बदलें, Lat/Lng को वैसा ही रखें जो current में है।
  onChange={(e) => onLocationUpdate(e.target.value, currentLocation || mapCenter)} 
  style={{ /* ... styles ... */ }}
/>

      </StandaloneSearchBox>

      {/* 2. इंटरैक्टिव मैप */}
      <div style={{ marginTop: '10px' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter} // ✅ लोकल स्टेट का उपयोग करें
          zoom={15}
        >
          {currentLocation && (
            <MarkerF
              position={currentLocation}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>

      {/* 3. लाइव लोकेशन बटन */}
      <button
        type="button"
        onClick={handleGeolocation} // ✅ useCallback फ़ंक्शन का उपयोग करें
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
