// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';
import { auth } from './firebase.ts'; // Firebase auth इंस्टेंस इम्पोर्ट करें

export const queryClient = new QueryClient();

// एक जेनेरिक API रिक्वेस्ट फ़ंक्शन
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string, // API पाथ (जैसे "/api/auth/login")
  data?: unknown // POST/PUT/DELETE के लिए बॉडी डेटा
): Promise<T> {
  // ✅ baseUrl को वापस लाएं और इसे अनिवार्य बनाएं
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) {
    throw new Error('VITE_BACKEND_URL is not defined in environment variables.');
  }

  const url = `${baseUrl}${path}`; // ✅ baseUrl का उपयोग करके पूर्ण URL बनाएं

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Firebase ID टोकन प्राप्त करें और इसे Authorization हेडर में जोड़ें
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
      console.log(`apiRequest: Adding Authorization header with token (length: ${idToken.length}) for path: ${path}`);
    } else {
      console.log(`apiRequest: No current Firebase user for path: ${path}, not adding Authorization header.`);
    }
  } catch (error) {
    console.error("Error getting Firebase ID token in apiRequest:", error);
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    // ✅ त्रुटि रिस्पॉन्स को बेहतर ढंग से संभालें
    if (!response.ok) {
      let errorDetail = 'Unknown error';
      // यदि रिस्पॉन्स JSON है, तो एरर डिटेल पार्स करने की कोशिश करें
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
          console.error("Failed to parse error response JSON:", jsonError);
          errorDetail = await response.text(); // JSON न होने पर टेक्स्ट के रूप में पढ़ें
        }
      } else {
        errorDetail = await response.text(); // JSON न होने पर टेक्स्ट के रूप में पढ़ें
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorDetail} for path: ${path}`);
    }

    // ✅ 204 No Content को हैंडल करें
    if (response.status === 204) {
      return null as T; // 204 के लिए null रिटर्न करें
    }

    // ✅ सुनिश्चित करें कि रिस्पॉन्स में JSON कंटेंट है
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    } else {
      // यदि अपेक्षित JSON नहीं है, तो एक एरर फेंकें या खाली ऑब्जेक्ट/टेक्स्ट रिटर्न करें
      // सुरक्षा के लिए, हम यहां एरर फेंकना पसंद करेंगे यदि हम हमेशा JSON की उम्मीद करते हैं
      throw new Error(`Expected JSON response, but received content type: ${contentType} for path: ${path}`);
    }

  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    // एरर को आगे बढ़ाएं ताकि कॉलिंग कोड इसे पकड़ सके
    throw error;
  }
}

