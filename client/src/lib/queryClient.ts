// src/lib/queryClient.ts (या जहाँ भी आपका apiRequest फ़ंक्शन परिभाषित है)

import { QueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase'; // Firebase auth इंस्टेंस इम्पोर्ट करें

export const queryClient = new QueryClient();

// एक जेनेरिक API रिक्वेस्ट फ़ंक्शन
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown // POST/PUT/DELETE के लिए बॉडी डेटा
): Promise<T> {
  const baseUrl = import.meta.env.VITE_BACKEND_URL; // सुनिश्चित करें कि यह आपके .env में सही से सेट है
  if (!baseUrl) {
    throw new Error('VITE_BACKEND_URL is not defined in environment variables.');
  }

  const url = `${baseUrl}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // ✅ Firebase ID टोकन प्राप्त करें और इसे Authorization हेडर में जोड़ें
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
      console.log(`apiRequest: Adding Authorization header with token (length: ${idToken.length})`); // लॉग करें कि टोकन जोड़ा जा रहा है
    } else {
      console.log("apiRequest: No current Firebase user, not adding Authorization header."); // लॉग करें जब टोकन न जोड़ा जा रहा हो
    }
  } catch (error) {
    console.error("Error getting Firebase ID token in apiRequest:", error);
    // यदि टोकन प्राप्त करने में विफल रहता है, तो भी अनुरोध जारी रखें, लेकिन बिना टोकन के
    // (हालांकि /api/auth/login के लिए यह विफल हो जाएगा)
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

    // यदि प्रतिक्रिया OK नहीं है (जैसे 400, 401, 403, 404, 500)
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        // यदि बैकएंड ने एक विशिष्ट त्रुटि संदेश भेजा है, तो उसका उपयोग करें
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (jsonError) {
        // यदि प्रतिक्रिया JSON नहीं है, तो सामान्य संदेश का उपयोग करें
        console.error("Failed to parse error response JSON:", jsonError);
      }
      throw new Error(errorMessage);
    }

    // यदि प्रतिक्रिया की कोई सामग्री नहीं है (जैसे 204 No Content)
    if (response.status === 204) {
      return null as T; // या undefined, जैसा आपके API के लिए उपयुक्त हो
    }

    return await response.json() as T;

  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error; // त्रुटि को आगे फेंक दें
  }
}
