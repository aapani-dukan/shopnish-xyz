import Header from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Seller, ProductWithSeller, OrderWithItems } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Star,
  Clock,
  CheckCircle,
  Settings,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import ProductManager from "./ProductManager";
import OrderManager from "../components/OrderManager";
import ProfileManager from "./ProfileManager";

export default function SellerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const { socket } = useSocket();
  const { user, isAuthenticated } = useAuth();

  // Socket.IO लॉजिक
  useEffect(() => {
    if (!socket || !isAuthenticated || user?.role !== "seller") {
      return;
    }

    socket.on("new-order-for-seller", (order) => {
      console.log("Received new order for seller:", order);
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/orders"] });
      toast({
        title: "🔔 नया ऑर्डर!",
        description: `आपको ऑर्डर #${order.id} के लिए एक नया ऑर्डर मिला है।`,
        duration: 5000,
      });
    });

    return () => {
      socket.off("new-order-for-seller");
    };
  }, [socket, isAuthenticated, user, toast, queryClient]);

  // Fetch seller profile
  const { data: seller, isLoading: sellerLoading, error: sellerError } = useQuery<Seller>({
    queryKey: ["/api/sellers/me"],
    queryFn: () => apiRequest("GET", "/api/sellers/me"),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch seller's orders
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/sellers/orders"],
    queryFn: () => apiRequest("GET", "/api/sellers/orders"),
    enabled: !!seller?.id,
    staleTime: 0,
    refetchInterval: 60 * 1000,
  });

  // Calculate dashboard metrics
  const totalRevenue = orders?.reduce((sum, order) =>
    sum + order.items.reduce((itemSum, item) =>
      itemSum + (typeof item.total === 'string' ? parseFloat(item.total) : item.total), 0
    ), 0
  ) || 0;
  const totalOrders = orders?.length || 0;
  const totalProducts = 0; // ये जानकारी ProductsManager में है
  const averageRating = parseFloat(seller?.rating?.toString() || "0");

  if (sellerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-full mb-4 rounded-md" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (sellerError || !seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="text-6xl mb-4">
            {sellerError ? <XCircle className="w-20 h-20 text-red-500 mx-auto" /> : "🏪"}
          </div>
          <h2 className="text-2xl font-bold mb-4">{sellerError ? "Error Loading Profile" : "Seller Profile Not Found"}</h2>
          <p className="text-muted-foreground mb-6">
            {sellerError ? "There was an issue fetching your seller profile. Please try again." : "It looks like you haven't set up your seller profile yet or it's not approved."}
          </p>
          <Link to="/seller-apply">
            <Button>
              {sellerError ? "Retry" : "Apply to be a Seller"}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="ml-4">
              Go Back Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and orders</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {seller.approvalStatus === "approved" ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified Seller
              </Badge>
            ) : seller.approvalStatus === "pending" ? (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Pending Verification
              </Badge>
            ) : ( // rejected
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Rejected ({seller.rejectionReason || "No reason specified"})
              </Badge>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingCart className="h-8 w-8 text-secondary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{0}</p> {/* Dynamic value from ProductManager */}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="h-4 w-4 mr-2" /> Orders
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManager seller={seller} />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManager seller={seller} orders={orders} isLoading={ordersLoading} error={ordersError} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileManager seller={seller} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
