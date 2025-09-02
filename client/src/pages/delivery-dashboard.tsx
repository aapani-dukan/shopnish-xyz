// client/src/pages/delivery-dashboard/DeliveryDashboard.tsx
import React, { useEffect, useState } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import DeliveryOrdersList from "./DeliveryOrdersList";
import { QueryClient } from "@tanstack/react-query";

// -----------------------------------------------------------------------------
// Firebase config (आपका पहले वाला config)
const firebaseConfig = typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

// TanStack QueryClient
const queryClient = new QueryClient();

export default function DeliveryDashboardWrapper() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    let unsubscribeAuth;

    try {
      if (!getApps().length) initializeApp(firebaseConfig);

      const tempAuth = getAuth();
      setAuth(tempAuth);

      unsubscribeAuth = onAuthStateChanged(tempAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setAuthReady(true);
        } else {
          setUserId(null);
          setAuthReady(false);
          if (initialAuthToken) {
            await signInWithCustomToken(tempAuth, initialAuthToken);
          } else {
            await signInAnonymously(tempAuth);
          }
        }
      });

      return () => {
        if (unsubscribeAuth) unsubscribeAuth();
      };
    } catch (error) {
      console.error("Firebase initialization failed:", error);
    }
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DeliveryOrdersList userId={userId!} auth={auth} />
    </QueryClientProvider>
  );
}
