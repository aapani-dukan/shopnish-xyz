import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import "./index.css";

// Pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const currentPath = location;

  useEffect(() => {
    console.log("--- Auth Debug ---");
    console.log("isAuthenticated:", isAuthenticated);
    console.log("currentPath:", currentPath);
  }, [isAuthenticated, currentPath]);

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // 🔐 अगर user authenticated नहीं है तो केवल "/" और "/login" allow करें
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

  // ✅ Authenticated user के लिए बाकी routes allow
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
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
