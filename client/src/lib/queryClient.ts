// client/src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase.ts';


/**
 * जाँचता है कि क्या रिस्पॉन्स ठीक है, और अगर नहीं, तो एक विस्तृत एरर थ्रो करता है।
 * यह JSON और टेक्स्ट रिस्पॉन्स दोनों को हैंडल करता है।
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const responseText = await res.text();
      if (responseText.trim() !== '') {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = JSON.parse(responseText);
          errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorDetail = responseText;
        }
      }
    } catch (parseError) {
      console.error(`Error parsing non-OK response (status: ${res.status}):`, parseError);
    }
    throw new Error(`${res.status}: ${errorDetail}`);
  }
}

/**
 * एक सामान्य API अनुरोध फ़ंक्शन जो Firebase Auth टोकन जोड़ता है
 * और FormData या JSON डेटा को सही ढंग से हैंडल करता है।
 */
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown | FormData,
  requestOptions?: RequestInit
): Promise<any> {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  if (!BASE_URL) {
    throw new Error('API_BACKEND_URL पर्यावरण वैरिएबल में परिभाषित नहीं है।');
  }

  const url = `${BASE_URL}${path}`;
  console.log(`[API Request] Sending ${method} request to: ${url}`);

  const user = auth.currentUser;
  let token = null;

  // ✅ केवल तभी टोकन प्राप्त करें जब उपयोगकर्ता मौजूद हो
  if (user) {
    try {
      token = await user.getIdToken();
    } catch (error) {
      console.error("Firebase ID टोकन प्राप्त करने में त्रुटि:", error);
      throw new Error("प्रमाणीकरण टोकन प्राप्त करने में विफल। कृपया पुनः प्रयास करें।");
    }
  }

  const headers: HeadersInit = {
    ...(requestOptions?.headers || {}),
  };

  // ✅ यदि टोकन मौजूद है, तो उसे headers में जोड़ें
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (data instanceof FormData) {
      body = data;
    } else if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
  }

  const config: RequestInit = {
    method,
    headers,
    body,
    credentials: "include",
    ...requestOptions,
  };

  try {
    const res = await fetch(url, config);
    await throwIfResNotOk(res);
    
    const responseText = await res.text();
    if (responseText.trim() === '') {
      return null;
    }
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T | null> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const path = queryKey[0] as string; 
    
    const res = await apiRequest(
      "GET", 
      path, 
      undefined,
      { signal }
    );

    return res as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
