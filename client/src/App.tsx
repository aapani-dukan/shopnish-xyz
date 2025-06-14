import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { useSeller } from "@/hooks/useSeller";
import { useEffect } from "react";
import "./index.css";

// Pages (सिर्फ वे जो फ़ाइलों में 100% हैं)
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isSeller, seller, isLoading: isSellerLoading } = useSeller();
  const [location, setLocation] = useLocation();
  const currentPath = location;

  const isLoading = isAuthLoading || isSellerLoading;

  useEffect(() => {
    console.log("--- App State ---");
    console.log("isAuthenticated:", isAuthenticated);
    console.log("isSeller:", isSeller);
    console.log("seller status:", seller?.approvalStatus);
    console.log("currentPath:", currentPath);
  }, [isAuthenticated, isSeller, seller, currentPath]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentPath !== "/" && currentPath !== "/login") {
      setLocation("/");
      return null;
    }
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
