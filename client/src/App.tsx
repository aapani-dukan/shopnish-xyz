import { Switch, Route, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found"; // simple component showing 404

const qc = new QueryClient();

function Routes() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loc, setLoc] = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center">⌛</div>;

  // If NOT logged in → always on landing
  if (!isAuthenticated) {
    if (loc !== "/" && loc !== "/login") setLoc("/");
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Logged‑in user → home page only
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Routes />
    </QueryClientProvider>
  );
}
