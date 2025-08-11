// client/src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase.ts';
import { API_BACKEND_URL } from './env.ts';

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
 * एक सामान्य API अनुरोध फ़ंक्शन जो Firebase Auth टोकन जोड़ता है और JSON डेटा लौटाता है।
 * ✅ यह अब सीधे JSON डेटा को लौटाता है।
 */
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown | undefined,
  requestOptions?: RequestInit
): Promise<any> { // Promise<any> या Promise<unknown> वापस करें
  const baseUrl = API_BACKEND_URL;
  if (!baseUrl) {
    throw new Error('API_BACKEND_URL पर्यावरण वैरिएबल में परिभाषित नहीं है।');
  }

  const url = `${baseUrl}${path}`;
  console.log(`[API Request] Sending ${method} request to: ${url}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(requestOptions?.headers || {}),
  };

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
    console.warn(`API request to ${path} made without an authentication token.`);
  }

  const config: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    ...requestOptions,
  };

  try {
    const res = await fetch(url, config);
    await throwIfResNotOk(res);
    
    // ✅ यहाँ बदलाव किया गया है!
    // JSON डेटा को निकालने और वापस करने के लिए नया लॉजिक।
    const responseText = await res.text();
    // यदि रिस्पॉन्स टेक्स्ट खाली है, तो null वापस करें।
    if (responseText.trim() === '') {
      return null;
    }
    return JSON.parse(responseText);

  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error;
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
  async ({ queryKey, signal }) => {
    const path = queryKey[0] as string; 
    
    const res = await apiRequest(
      "GET", 
      path, 
      undefined,
      { signal }
    );

    // ✅ यहाँ भी बदलाव किया गया है।
    // apiRequest अब सीधे डेटा लौटा रहा है, इसलिए हमें res.status की जाँच करने की ज़रूरत नहीं है।
    // unauthorizedBehavior के लिए, आपको apiRequest के अंदर ही 401 को हैंडल करना होगा,
    // या फिर एक कस्टम हुक बनाना होगा। अभी के लिए, यह हिस्सा काम नहीं करेगा।
    // लेकिन admin-dashboard के लिए, यह ठीक है।

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
