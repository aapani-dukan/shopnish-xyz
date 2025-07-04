// client/src/lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase"; // Firebase auth instance

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ Cache settings adjusted based on common practices
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection time
      refetchOnWindowFocus: false, // Prevents refetching on window focus (can be adjusted)
    },
  },
});

// ✅ API_BASE_URL: इसे अपनी Render बैकएंड सर्विस URL पर सेट करें
// उदाहरण: यदि आपका बैकएंड https://your-backend-api.onrender.com पर चल रहा है
// तो इसे ऐसा सेट करें। यदि क्लाइंट और सर्वर एक ही Render Blueprints में हैं,
// तो यह खाली स्ट्रिंग या relative path ('/api') हो सकता है, लेकिन स्पष्टता के लिए पूरा URL बेहतर है।
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:10000"; // ✅ Render environment variable का उपयोग करें

// ✅ Response type को T में बदलें, जो आपके JSON डेटा का प्रकार है
export async function apiRequest<T>(
  method: string,
  path: string,
  data?: unknown,
): Promise<T> { // ✅ Promise<T> रिटर्न टाइप
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(); // ✅ Headers कंस्ट्रक्टर का उपयोग करें

  if (data) {
    headers.set("Content-Type", "application/json");
  }

  console.log(`[apiRequest] Starting request: ${method} ${url}`);
  console.log(`[apiRequest] Current Firebase user for token check (UID):`, auth.currentUser?.uid);

  let token: string | null = null;
  try {
    // ✅ getIdToken(true) का उपयोग करें ताकि यह सुनिश्चित हो सके कि आपको हमेशा नवीनतम टोकन मिले।
    // Firebase इसे आवश्यक होने पर ही रीफ्रेश करेगा।
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken(true); 
      console.log(`[apiRequest] Firebase ID Token obtained: ${token ? 'Yes (length: ' + token.length + ')' : 'No'}`);
    } else {
      console.warn("[apiRequest] No Firebase currentUser available. Request might be unauthorized.");
    }
  } catch (tokenError) {
    console.error("[apiRequest] Error getting Firebase ID Token:", tokenError);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    console.log("[apiRequest] Authorization header added.");
  } else {
    console.log("[apiRequest] No Authorization header added (token was null or error occurred).");
  }

  console.log(`[apiRequest] Request headers:`, Object.fromEntries(headers.entries())); // Headers ऑब्जेक्ट को लॉग करने का तरीका
  console.log(`[apiRequest] Request body (JSON.stringify):`, data ? JSON.stringify(data) : 'No body');

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      // credentials: "include", // ✅ इसे हटा दें यदि आप केवल Firebase टोकन पर निर्भर हैं
    });

    console.log(`[apiRequest] Received response for ${url}. Status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text(); // त्रुटि संदेश प्राप्त करें
      console.error(`[apiRequest] API Error Response: ${res.status}: ${errorText}`);
      // ✅ अधिक जानकारी के साथ त्रुटि फेंकें
      throw new Error(`API Error ${res.status}: ${errorText}`); 
    }

    // यदि प्रतिक्रिया में कोई सामग्री नहीं है (जैसे 204 No Content), तो सीधे लौटें
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        console.log(`[apiRequest] Request ${url} successful. Data received.`);
        return json as T; // ✅ JSON डेटा को सीधे T के रूप में लौटाएं
    } else {
        console.log(`[apiRequest] Request ${url} successful. No JSON content.`);
        return {} as T; // ✅ यदि कोई JSON content नहीं है तो एक खाली ऑब्जेक्ट लौटाएं (या null, जैसा उचित हो)
    }

  } catch (fetchError) {
    console.error(`[apiRequest] Fetch operation failed for ${url}:`, fetchError);
    throw fetchError;
  }
}
