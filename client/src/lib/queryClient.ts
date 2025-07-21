// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';
import { auth } from './firebase.ts'; // Firebase auth इंस्टेंस इम्पोर्ट करें

export const queryClient = new QueryClient();

// एक जेनेरिक API रिक्वेस्ट फ़ंक्शन
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string, // ✅ अब path एक पूर्ण URL नहीं होगा, बल्कि केवल API पाथ होगा (जैसे "/api/auth/login")
  data?: unknown // POST/PUT/DELETE के लिए बॉडी डेटा
): Promise<T> {
  // ✅ baseUrl को हटा दें क्योंकि हम रिलेटिव पाथ का उपयोग कर रहे हैं
  // const baseUrl = import.meta.env.VITE_BACKEND_URL;
  // if (!baseUrl) {
  //   throw new Error('VITE_BACKEND_URL is not defined in environment variables.');
  // }

  // ✅ url सीधे path से बनेगा
  const url = path; 

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

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText} for path: ${path}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (jsonError) {
        console.error("Failed to parse error response JSON:", jsonError);
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as T;
    }

    return await response.json() as T;

  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error;
  }
}
