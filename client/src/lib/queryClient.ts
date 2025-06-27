import { QueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});

const API_BASE_URL = ""; // अगर आपके पास कोई बेस URL हो तो यहाँ भरें

// ✅ टाइप सेफ API कॉल फ़ंक्शन
export async function apiRequest<T>(
  method: string,
  path: string,
  data?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  console.log(`[apiRequest] Starting request: ${method} ${url}`);
  console.log(`[apiRequest] Current Firebase user for token check:`, auth.currentUser);

  let token: string | null = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
      console.log(`[apiRequest] Firebase ID Token obtained: ${token ? "Yes" : "No"}`);
    } else {
      console.warn("[apiRequest] No Firebase currentUser available to get ID token. Request might be unauthorized.");
    }
  } catch (tokenError) {
    console.error("[apiRequest] Error getting Firebase ID Token:", tokenError);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("[apiRequest] Authorization header added.");
  } else {
    console.log("[apiRequest] No Authorization header added (token was null or error occurred).");
  }

  console.log("[apiRequest] Request headers:", headers);
  console.log("[apiRequest] Request body (JSON.stringify):", data ? JSON.stringify(data) : "No body");

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`[apiRequest] Received response for ${url}. Status: ${res.status}`);

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      console.error(`[apiRequest] API Error Response: ${res.status}: ${text}`);
      throw new Error(`${res.status}: ${text}`);
    }

    console.log(`[apiRequest] Request ${url} successful.`);
    const json = await res.json(); // ✅ Properly returning typed JSON response
    return json as T;
  } catch (fetchError) {
    console.error(`[apiRequest] Fetch operation failed for ${url}:`, fetchError);
    throw fetchError;
  }
}

