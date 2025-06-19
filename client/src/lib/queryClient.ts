// client/src/lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase"; // सुनिश्चित करें कि Firebase auth ऑब्जेक्ट सही ढंग से इम्पोर्ट हो रहा है

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // डेटा को हमेशा stale मानें, ताकि यह अपडेट हो सके
      cacheTime: Infinity, // कैश को कभी एक्सपायर न करें
    },
  },
});

// जब आपका फ्रंटएंड और बैकएंड एक ही डोमेन पर होते हैं (जैसे Render पर एक ही सर्विस में),
// तो API_BASE_URL को खाली स्ट्रिंग "" पर सेट करें ताकि API कॉल रिलेटिव पाथ का उपयोग करें।
// उदाहरण: /api/users
const API_BASE_URL = "";

export async function apiRequest<T>(
  method: string,
  path: string,
  data?: any
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`; // URL अब जैसे "/api/users" होगा

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // --- डीबगिंग लॉग्स ---
  console.log(`[apiRequest] Starting request: ${method} ${url}`);
  console.log(`[apiRequest] Current Firebase user for token check:`, auth.currentUser);
  // --- डीबगिंग लॉग्स ---

  let token: string | null = null;
  try {
    // Firebase ID टोकन प्राप्त करने का प्रयास करें
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
      console.log(`[apiRequest] Firebase ID Token obtained: ${token ? 'Yes' : 'No'}`); // देखें कि टोकन मिला या नहीं
    } else {
      console.warn("[apiRequest] No Firebase currentUser available to get ID token. Request might be unauthorized.");
    }
  } catch (tokenError) {
    // यदि टोकन प्राप्त करने में कोई एरर आती है, तो उसे लॉग करें लेकिन रिक्वेस्ट को ब्लॉक न करें
    console.error("[apiRequest] Error getting Firebase ID Token:", tokenError);
  }

  // यदि टोकन सफलतापूर्वक प्राप्त हो गया है, तो Authorization हेडर जोड़ें
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[apiRequest] Authorization header added.");
  } else {
    console.log("[apiRequest] No Authorization header added (token was null or error occurred).");
  }

  // --- डीबगिंग लॉग्स ---
  console.log(`[apiRequest] Request headers:`, headers);
  console.log(`[apiRequest] Request body (JSON.stringify):`, data ? JSON.stringify(data) : 'No body');
  // --- डीबगिंग लॉग्स ---

  try {
    // API रिक्वेस्ट भेजें
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log(`[apiRequest] Received response for ${url}. Status: ${response.status}`);

    // यदि रिस्पॉन्स `ok` नहीं है (जैसे 4xx या 5xx स्टेटस कोड), तो एरर थ्रो करें
    if (!response.ok) {
      const errorBody = await response.text(); // एरर मैसेज के लिए पूरा रिस्पॉन्स टेक्स्ट प्राप्त करें
      console.error(`[apiRequest] API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    console.log(`[apiRequest] Request ${url} successful.`);
    return response; // सफल रिस्पॉन्स लौटाएँ
  } catch (fetchError) {
    // `fetch` ऑपरेशन के दौरान होने वाली किसी भी नेटवर्क या अन्य एरर को पकड़ें
    console.error(`[apiRequest] Fetch operation failed for ${url}:`, fetchError);
    throw fetchError; // एरर को आगे बढ़ाएं ताकि कॉलिंग फंक्शन इसे हैंडल कर सके
  }
}
