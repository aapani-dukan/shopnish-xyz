import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";
import { AuthRedirectGuard } from "@/components/auth-redirect-guard";

// ✅ Correct imports
import DeliveryLogin from "@/pages/delivery-login";
import SellerLogin from "@/pages/seller/SellerLogin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/delivery-login" component={DeliveryLogin} />
      <Route path="/SellerLogin" component={SellerLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthRedirectGuard />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
