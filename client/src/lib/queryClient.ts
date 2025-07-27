// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';
import { auth } from './firebase.ts'; // Firebase auth इंस्टेंस इम्पोर्ट करें
import { getAuth } from "firebase/auth"; /
export const queryClient = new QueryClient();

// एक जेनेरिक API रिक्वेस्ट फ़ंक्शन

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
  options?: RequestInit // Add options parameter for more flexibility
): Promise<T> {
  const baseUrl = import.meta.env.VITE_BACKEND_URL;
  if (!baseUrl) {
    throw new Error('VITE_BACKEND_URL पर्यावरण वैरिएबल में परिभाषित नहीं है।');
  }

  const url = `${baseUrl}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}), // Merge any additional headers
  };

  // Firebase ID टोकन अधिग्रहण (यह खंड आपकी मूल फ़ाइल से अपरिवर्तित रहेगा)
  const auth = getAuth();
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Firebase ID टोकन प्राप्त करने में त्रुटि:", error);
      throw new Error("प्रमाणीकरण टोकन प्राप्त करने में विफल। कृपया पुनः प्रयास करें।");
    }
  } else if (path !== '/api/auth/login' && path !== '/api/auth/signup') {
    // केवल उन पथों के लिए एरर फेंकें जिन्हें प्रमाणीकरण की आवश्यकता होती है
    // उन पथों को छोड़ दें जिन्हें प्रमाणीकरण की आवश्यकता नहीं होती है (जैसे /api/products, /api/categories)
    // यदि आपकी API बिना टोकन के कुछ सार्वजनिक डेटा प्रदान करती है
    console.warn(`प्रमाणीकरण टोकन के बिना API अनुरोध ${path} पर किया गया।`);
  }
  // ----------------------------------------------------------------------


  const config: RequestInit = {
    method,
    headers,
    ...options, // Merge any additional request options
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorDetail = 'अज्ञात त्रुटि';
      let responseText = ''; // रिस्पॉन्स टेक्स्ट को स्टोर करने के लिए

      try {
        responseText = await response.text(); // पहले टेक्स्ट के रूप में पढ़ें
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          // यदि JSON है, तो इसे पार्स करने का प्रयास करें
          const errorData = JSON.parse(responseText);
          errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          // यदि JSON नहीं है, तो सादे टेक्स्ट को एरर के रूप में उपयोग करें
          errorDetail = responseText || `स्थिति: ${response.status} ${response.statusText}`;
        }
      } catch (parseError) {
        // यदि JSON.parse या response.text() में कोई एरर आती है
        console.error(`एरर प्रतिक्रिया को पार्स करने में विफल रहा (स्थिति: ${response.status}, सामग्री: "${responseText.substring(0, 100)}"):`, parseError);
        errorDetail = `प्रतिक्रिया पढ़ने में त्रुटि। स्थिति: ${response.status} ${response.statusText}. सामग्री का एक हिस्सा: ${responseText.substring(0, 50)}...`;
      }
      throw new Error(`API अनुरोध विफल: ${response.status} - ${errorDetail} पथ के लिए: ${path}`);
    }

    if (response.status === 204) { // No Content
      return null as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text(); // ✅ पहले टेक्स्ट के रूप में पढ़ें
      if (responseText.trim() === 'null' || responseText.trim() === '') {
        console.warn(`खाली या 'null' JSON प्रतिक्रिया के साथ 200 OK प्राप्त हुआ ${path} के लिए। इसे null माना जा रहा है।`);
        return null as T;
      }
      try {
        return JSON.parse(responseText) as T; // ✅ टेक्स्ट को JSON के रूप में पार्स करें
      } catch (parseError) {
        console.error(`"${path}" के लिए JSON पार्सिंग त्रुटि (सामग्री: "${responseText.substring(0, 100)}"):`, parseError);
        throw new Error(`अमान्य JSON प्रतिक्रिया पथ के लिए: ${path}. प्राप्त सामग्री: ${responseText}`);
      }
    } else {
      const responseText = await response.text();
      if (responseText.trim() === "") {
         console.warn(`गैर-JSON खाली प्रतिक्रिया के साथ 200 OK प्राप्त हुआ ${path} के लिए। इसे null माना जा रहा है।`);
         return null as T;
      }
      throw new Error(`अपेक्षित JSON प्रतिक्रिया, लेकिन प्राप्त content type: ${contentType || 'कोई नहीं'} और पथ के लिए गैर-खाली टेक्स्ट: ${path}। प्रतिक्रिया: ${responseText.substring(0, 200)}`);
    }

  } catch (error) {
    // सुनिश्चित करें कि हम एक मानक Error ऑब्जेक्ट फेंकते हैं
    if (error instanceof Error) {
        console.error(`API अनुरोध के दौरान त्रुटि ${url} पर:`, error);
        throw error;
    } else {
        console.error(`API अनुरोध के दौरान एक अज्ञात त्रुटि ${url} पर:`, error);
        throw new Error(`API अनुरोध के दौरान एक अज्ञात त्रुटि: ${JSON.stringify(error)}`);
    }
  }
}
