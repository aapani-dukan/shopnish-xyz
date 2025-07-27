// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';
import { auth } from './firebase.ts'; // Firebase auth इंस्टेंस इम्पोर्ट करें

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

  // Firebase ID टोकन अधिग्रहण
  // ✅ यहाँ हमने 'getAuth()' कॉल को हटा दिया है और सीधे इम्पोर्ट किए गए 'auth' इंस्टेंस का उपयोग कर रहे हैं।
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
    // केवल उन पथों के लिए चेतावनी दें जिन्हें आम तौर पर प्रमाणीकरण की आवश्यकता होती है, सार्वजनिक मार्गों के लिए आवश्यकतानुसार समायोजित करें
    console.warn(`प्रमाणीकरण टोकन के बिना API अनुरोध ${path} पर किया गया।`);
  }
  
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
    const contentType = response.headers.get('content-type');
    let responseText = '';

    // रिस्पॉन्स टेक्स्ट को हमेशा पढ़ने का प्रयास करें, चाहे वह सफल हो या एरर का मामला हो
    try {
      responseText = await response.text();
    } catch (readError) {
      console.warn(`${path} के लिए रिस्पॉन्स टेक्स्ट पढ़ा नहीं जा सका:`, readError);
    }

    if (!response.ok) {
      let errorDetail = 'अज्ञात त्रुटि';
      try {
        if (contentType && contentType.includes('application/json') && responseText.trim() !== '') {
          const errorData = JSON.parse(responseText);
          errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorDetail = responseText || response.statusText;
        }
      } catch (parseError) {
        console.error(`एरर रिस्पॉन्स को पार्स करने में विफल (स्थिति: ${response.status}, कंटेंट-टाइप: ${contentType}, टेक्स्ट: "${responseText.substring(0, 100)}"):`, parseError);
        errorDetail = `एरर रिस्पॉन्स को पढ़ने/पार्स करने में विफल। स्थिति: ${response.status} ${response.statusText}. आंशिक सामग्री: ${responseText.substring(0, 50)}...`;
      }
      throw new Error(`API अनुरोध विफल: ${response.status} - ${errorDetail} पथ के लिए: ${path}`);
    }

    // 204 नो कंटेंट को स्पष्ट रूप से हैंडल करें
    if (response.status === 204 || responseText.trim() === '') {
      return null as T; // नो कंटेंट या खाली रिस्पॉन्स के लिए null लौटाएं
    }

    // JSON रिस्पॉन्स को हैंडल करें
    if (contentType && contentType.includes('application/json')) {
      try {
        // भले ही कंटेंट-टाइप JSON हो, शाब्दिक 'null' के लिए जाँच करें
        if (responseText.trim() === 'null') {
          return null as T;
        }
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        console.error(`"${path}" के लिए JSON पार्सिंग एरर (सामग्री: "${responseText.substring(0, 100)}"):`, parseError);
        throw new Error(`पथ के लिए अमान्य JSON रिस्पॉन्स: ${path}. प्राप्त सामग्री: ${responseText}`);
      }
    } else {
      // यदि कंटेंट-टाइप JSON नहीं है लेकिन रिस्पॉन्स खाली नहीं है, तो यह अप्रत्याशित है
      throw new Error(`अपेक्षित JSON रिस्पॉन्स, लेकिन प्राप्त कंटेंट-टाइप: ${contentType || 'कोई नहीं'} और पथ के लिए गैर-खाली टेक्स्ट: ${path}. रिस्पॉन्स: ${responseText.substring(0, 200)}`);
    }

  } catch (error) {
    if (error instanceof Error) {
        console.error(`API अनुरोध के दौरान ${url} पर एरर:`, error);
        throw error;
    } else {
        console.error(`API अनुरोध के दौरान ${url} पर एक अज्ञात एरर हुई:`, error);
        throw new Error(`API अनुरोध के दौरान एक अज्ञात एरर: ${JSON.stringify(error)}`);
    }
  }
}
