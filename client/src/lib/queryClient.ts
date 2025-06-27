// client/src/lib/queryClient.ts

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

const API_BASE_URL = ""; // यह सुनिश्चित करें कि यह खाली स्ट्रिंग हो

// यह वह apiRequest है जिसे हम उपयोग करेंगे!
export async function apiRequest<T>(
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  let token: string | null = null;
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (tokenError) {
    console.error("[apiRequest] Token error:", tokenError);
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    // ✅ ये करो: Parsed JSON return करो
    const json = await res.json();
    return json;
  } catch (fetchError) {
    console.error(`[apiRequest] Fetch failed: ${url}`, fetchError);
    throw fetchError;
  }
}
