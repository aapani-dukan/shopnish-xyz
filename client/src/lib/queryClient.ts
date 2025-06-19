// client/src/lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase"; // सुनिश्चित करें कि Firebase auth ऑब्जेक्ट सही ढंग से इम्पोर्ट हो रहा है

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

// Production के लिए, Render पर अपने बैकएंड का पूरा URL डालें।
// उदाहरण: "https://your-backend-service.onrender.com"
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:10000";

export async function apiRequest<T>(
  method: string,
  path: string,
  data?: any
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // 🔥 लॉगिंग जोड़ें ताकि हम देख सकें कि apiRequest कब और कैसे कॉल हो रहा है
  console.log(`[apiRequest] Starting request: ${method} ${url}`);
  console.log(`[apiRequest] Current Firebase user:`, auth.currentUser); // Firebase user की स्थिति देखें

  let token: string | null = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
      console.log(`[apiRequest] Firebase ID Token obtained: ${token ? 'Yes' : 'No'}`); // टोकन मिला या नहीं
    } else {
      console.warn("[apiRequest] No Firebase currentUser available to get ID token.");
    }
  } catch (tokenError) {
    console.error("[apiRequest] Error getting Firebase ID Token:", tokenError);
    // यहां एरर को थ्रो न करें ताकि रिक्वेस्ट बिना टोकन के भी हो सके
    // यदि ऑथेंटिकेशन आवश्यक है तो बैकएंड 401 देगा
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[apiRequest] Authorization header added.");
  } else {
    console.log("[apiRequest] No Authorization header added (no token).");
  }

  // 🔥 यहां भी लॉगिंग जोड़ें, खासकर बॉडी के लिए
  console.log(`[apiRequest] Request headers:`, headers);
  console.log(`[apiRequest] Request body (JSON.stringify):`, data ? JSON.stringify(data) : 'No body');


  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log(`[apiRequest] Received response for ${url}. Status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[apiRequest] API Error Response: ${response.status} ${response.statusText} - ${errorBody}`);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    console.log(`[apiRequest] Request ${url} successful.`);
    return response;
  } catch (fetchError) {
    console.error(`[apiRequest] Fetch operation failed for ${url}:`, fetchError);
    throw fetchError; // एरर को आगे बढ़ाएं
  }
}
