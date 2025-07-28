// client/src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase.ts'; // Firebase auth इंस्टेंस इम्पोर्ट करें
import { API_BACKEND_URL } from './env.ts'; // ✅ API_BACKEND_URL को इम्पोर्ट करें

// यह फ़ंक्शन जांचता है कि HTTP रिस्पॉन्स सफल है या नहीं।
// यदि नहीं, तो यह एक एरर फेंकता है जिसमें स्टेटस और रिस्पॉन्स टेक्स्ट शामिल होता है।
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      // रिस्पॉन्स टेक्स्ट को पढ़ने का प्रयास करें
      const responseText = await res.text();
      if (responseText.trim() !== '') {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          // यदि JSON है, तो इसे पार्स करने का प्रयास करें
          const errorData = JSON.parse(responseText);
          errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          // यदि JSON नहीं है, तो सादे टेक्स्ट को एरर के रूप में उपयोग करें
          errorDetail = responseText;
        }
      }
    } catch (parseError) {
      console.error(`Error parsing non-OK response (status: ${res.status}):`, parseError);
      // यदि टेक्स्ट पढ़ने या पार्स करने में विफल रहता है, तो भी statusText का उपयोग करें
    }
    throw new Error(`${res.status}: ${errorDetail}`);
  }
}

/**
 * एक सामान्य API अनुरोध फ़ंक्शन जो Firebase Auth टोकन जोड़ता है।
 * यह raw Response ऑब्जेक्ट लौटाता है, ताकि कॉलर इसे अपनी इच्छानुसार हैंडल कर सके।
 */
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown | undefined,
  requestOptions?: RequestInit // अतिरिक्त fetch options के लिए
): Promise<Response> {
  // ✅ अब सीधे इम्पोर्टेड API_BACKEND_URL का उपयोग करें
  const baseUrl = API_BACKEND_URL; // 'import.meta.env.VITE_BACKEND_URL' की जगह इसे इस्तेमाल करें

  // यह if कंडीशन अब उतनी आवश्यक नहीं है यदि API_BACKEND_URL env.ts में हमेशा सेट होता है
  // लेकिन इसे सुरक्षित रखने के लिए रख सकते हैं यदि आप चाहें
  if (!baseUrl) {
    throw new Error('API_BACKEND_URL पर्यावरण वैरिएबल में परिभाषित नहीं है।');
  }

  const url = `${baseUrl}${path}`;

  // ✅ यह console.log अब आपको बताएगा कि रिक्वेस्ट किस URL पर भेजा जा रहा है
  console.log(`[API Request] Sending ${method} request to: ${url}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(requestOptions?.headers || {}), // पास किए गए किसी भी हेडर को मर्ज करें
  };

  // Firebase ID टोकन प्राप्त करें और हेडर में जोड़ें
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
    // केवल उन पथों के लिए चेतावनी दें जिन्हें आम तौर पर प्रमाणीकरण की आवश्यकता होती है
    console.warn(`API request to ${path} made without an authentication token.`);
  }

  const config: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // यह महत्वपूर्ण है यदि आप कुकीज़ या सत्र का उपयोग कर रहे हैं
    ...requestOptions, // अन्य विकल्पों को मर्ज करें
  };

  try {
    const res = await fetch(url, config);
    await throwIfResNotOk(res); // गैर-OK रिस्पॉन्स पर एरर फेंकें
    return res;
  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error; // एरर को फिर से फेंकें
  }
}

// यह परिभाषित करता है कि 401 Unauthorized रिस्पॉन्स को कैसे हैंडल करना है
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * React Query के लिए एक डिफ़ॉल्ट queryFn बनाता है।
 * यह queryKey को URL के रूप में मानता है।
 * यह 401 Unauthorized रिस्पॉन्स को विशिष्ट रूप से हैंडल कर सकता है।
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T | null> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => { // signal को जोड़ें
    // queryKey में पहला एलिमेंट पथ है
    const path = queryKey[0] as string; 
    
    // apiRequest का उपयोग करें, यह पहले से ही baseUrl और auth टोकन को हैंडल करता है
    const res = await apiRequest(
      "GET", 
      path, 
      undefined, // GET रिक्वेस्ट में डेटा नहीं होता
      { signal } // AbortController signal पास करें
    );

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`401 Unauthorized for ${path}. Returning null as configured.`);
      return null;
    }

    // यहाँ हम जानते हैं कि res.ok true है (क्योंकि throwIfResNotOk ने एरर नहीं फेंकी)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseText = await res.text();
      // खाली या शाब्दिक 'null' JSON रिस्पॉन्स को null के रूप में हैंडल करें
      if (responseText.trim() === '' || responseText.trim() === 'null') {
        console.warn(`Empty or 'null' JSON response for ${path}. Returning null.`);
        return null;
      }
      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        console.error(`JSON parsing error for ${path}:`, parseError);
        throw new Error(`Invalid JSON response for path: ${path}. Content: ${responseText.substring(0, 100)}`);
      }
    } else {
      // यदि यह JSON नहीं है, लेकिन सफल है और खाली नहीं है, तो यह एक एरर है
      const responseText = await res.text();
      throw new Error(`Expected JSON response for ${path}, but received content type: ${contentType || 'none'}. Content: ${responseText.substring(0, 100)}`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // डिफ़ॉल्ट रूप से 401 पर एरर फेंकें
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // डेटा को हमेशा stale मानें (या आवश्यकतानुसार बदलें)
      retry: false, // डिफ़ॉल्ट रूप से क्वेरीज़ को फिर से प्रयास न करें
    },
    mutations: {
      retry: false, // डिफ़ॉल्ट रूप से म्यूटेशन को फिर से प्रयास न करें
    },
  },
});
