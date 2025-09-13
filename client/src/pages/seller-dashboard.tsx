// src/pages/seller-dashboard.tsx

import React, { useEffect, useState } from "react"; // ✅ ठीक किया गया नामकरण
import Header from "@/components/header"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Card, CardContent } from "@/components/ui/card"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Badge } from "@/components/ui/badge"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Skeleton } from "@/components/ui/skeleton"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Button } from "@/components/ui/button"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useQuery, useQueryClient } from "@tanstack/react-query"; // ✅ ठीक किया गया नामकरण
import type { Seller, OrderWithItems } from "shared/backend/schema"; // ✅ ठीक किया गया नामकरण
import { apiRequest } from "@/lib/queryClient"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useToast } from "@/hooks/use-toast"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { Link } from "react-router-dom"; // ✅ ठीक किया गया नामकरण
import {
  Package, // ✅ ठीक किया गया नामकरण
  ShoppingCart, // ✅ ठीक किया गया नामकरण
  TrendingUp, // ✅ ठीक किया गया नामकरण
  Star, // ✅ ठीक किया गया नामकरण
  Clock, // ✅ ठीक किया गया नामकरण
  CheckCircle, // ✅ ठीक किया गया नामकरण
  Settings, // ✅ ठीक किया गया नामकरण
  XCircle, // ✅ ठीक किया गया नामकरण
} from "lucide-react";
import { useSocket } from "@/providers/SocketProvider"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import { useAuth } from "@/hooks/useAuth"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import ProductManager from "@/components/productManager"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import OrderManager from "@/components/orderManager"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ
import ProfileManager from "@/components/profileManager"; // ✅ ठीक किया गया नामकरण और इम्पोर्ट पाथ

export default function SellerDashboard() { // ✅ ठीक किया गया नामकरण
  const { toast } = useToast(); // ✅ ठीक किया गया नामकरण
  const queryClient = useQueryClient(); // ✅ ठीक किया गया नामकरण
  const [activeTab, setActiveTab] = useState("products"); // ✅ ठीक किया गया नामकरण

  // 🔌 useSocket से `socket` और `isConnected` को सही तरीके से डी-स्ट्रक्चर करें
  const { socket, isConnected: socketIsConnected } = useSocket(); // ✅ useSocket से सही डी-स्ट्रक्चरिंग

  const { user, isAuthenticated } = useAuth(); // ✅ ठीक किया गया नामकरण

  // ----------------- socket.io logic -----------------
  useEffect(() => { // ✅ ठीक किया गया नामकरण
    // ✅ `socket` अब सीधे सॉकेट इंस्टेंस है, इसलिए इसे null चेक करें
    if (!socket || !isAuthenticated || user?.role !== "seller") {
      console.log("SellerDashboard: Socket not ready or user not authenticated/seller. Skipping subscription.");
      return;
    }

    const handleNewOrderForSeller = (order: OrderWithItems) => { // ✅ ठीक किया गया नामकरण
      console.log("📦 नया ऑर्डर Seller को मिला:", order);

      queryClient.invalidateQueries({ queryKey: ["/api/sellers/orders"] }); // ✅ ठीक किया गया नामकरण

      toast({
        title: "🔔 नया ऑर्डर!",
        description: `आपको ऑर्डर #${order.id} के लिए नया ऑर्डर मिला।`,
        duration: 5000,
      });
    };

    socket.on("new-order-for-seller", handleNewOrderForSeller);

    return () => {
      // ✅ cleanup function में `handleNewOrderForSeller` को पास करें
      // ताकि `socket.off` सही लिसनर को हटा सके
      socket.off("new-order-for-seller", handleNewOrderForSeller); 
    };
  }, [socket, isAuthenticated, user?.role, toast, queryClient]); // ✅ `user?.role` पर निर्भर करें, न कि पूरे `user` ऑब्जेक्ट पर

  // ----------------- fetch seller profile -----------------
  const { data: seller, isLoading: sellerLoading, error: sellerError } = useQuery<Seller>({ // ✅ ठीक किया गया नामकरण
    queryKey: ["/api/sellers/me"], // ✅ ठीक किया गया नामकरण
    queryFn: () => apiRequest("GET", "/api/sellers/me"), // ✅ ठीक किया गया नामकरण
    staleTime: 5 * 60 * 1000, // ✅ ठीक किया गया नामकरण
  });

  // ----------------- fetch seller orders -----------------
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<OrderWithItems[]>({ // ✅ ठीक किया गया नामकरण
    queryKey: ["/api/sellers/orders"], // ✅ ठीक किया गया नामकरण
    queryFn: () => apiRequest("GET", "/api/sellers/orders"), // ✅ ठीक किया गया नामकरण
    enabled: !!seller?.id,
    staleTime: 0, // ✅ ठीक किया गया नामकरण
    refetchInterval: 60 * 1000, // ✅ ठीक किया गया नामकरण
  });

  // ----------------- metrics -----------------
  const totalRevenue = // ✅ ठीक किया गया नामकरण
    orders?.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => // ✅ ठीक किया गया नामकरण
            itemSum +
            (typeof item.total === "string" ? parseFloat(item.total) : item.total), // ✅ ठीक किया गया `parseFloat`
          0
        ),
      0
    ) || 0;

  const totalOrders = orders?.length || 0; // ✅ ठीक किया गया नामकरण
  const totalProducts = 0; // ✅ ठीक किया गया नामकरण (ProductManager से dynamic हो सकता है)
  const averageRating = parseFloat(seller?.rating?.toString() || "0"); // ✅ ठीक किया गया नामकरण और `parseFloat`

  // ----------------- loading -----------------
  if (sellerLoading) { // ✅ ठीक किया गया नामकरण
    return (
      <div className="min-h-screen bg-background"> {/* ✅ ठीक किया गया `className` */}
        <Header /> {/* ✅ ठीक किया गया नामकरण */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> {/* ✅ ठीक किया गया `className` */}
          <div className="animate-pulse space-y-6"> {/* ✅ ठीक किया गया `className` */}
            <Skeleton className="h-8 w-64 mb-6" /> {/* ✅ ठीक किया गया नामकरण */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6"> {/* ✅ ठीक किया गया `className` */}
              {[...Array(4)].map((_, i) => ( {/* ✅ ठीक किया गया `Array` */}
                <Skeleton key={i} className="h-32 rounded-xl" /> {/* ✅ ठीक किया गया नामकरण */}
              ))}
            </div>
            <Skeleton className="h-10 w-full mb-4 rounded-md" /> {/* ✅ ठीक किया गया नामकरण */}
            <Skeleton className="h-96 w-full rounded-xl" /> {/* ✅ ठीक किया गया नामकरण */}
          </div>
        </div>
      </div>
    );
  }

  // ----------------- error -----------------
  if (sellerError || !seller) { // ✅ ठीक किया गया नामकरण
    return (
      <div className="min-h-screen bg-background"> {/* ✅ ठीक किया गया `className` */}
        <Header /> {/* ✅ ठीक किया गया नामकरण */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center"> {/* ✅ ठीक किया गया `className` */}
          <div className="text-6xl mb-4"> {/* ✅ ठीक किया गया `className` */}
            {sellerError ? ( // ✅ ठीक किया गया नामकरण
              <XCircle className="w-20 h-20 text-red-500 mx-auto" /> {/* ✅ ठीक किया गया नामकरण */}
            ) : (
              "🏪"
            )}
          </div>
          <h2 className="text-2xl font-bold mb-4"> {/* ✅ ठीक किया गया `className` */}
            {sellerError ? "Error loading profile" : "Seller profile not found"} {/* ✅ ठीक किया गया नामकरण */}
          </h2>
          <p className="text-muted-foreground mb-6"> {/* ✅ ठीक किया गया `className` */}
            {sellerError
              ? "There was an issue fetching your seller profile. Please try again."
              : "It looks like you haven't set up your seller profile yet or it's not approved."}
          </p>
          <Link to="/seller-apply"> {/* ✅ ठीक किया गया नामकरण */}
            <Button>{sellerError ? "Retry" : "Apply to be a seller"}</Button> {/* ✅ ठीक किया गया नामकरण */}
          </Link>
          <Link to="/"> {/* ✅ ठीक किया गया नामकरण */}
            <Button variant="ghost" className="ml-4"> {/* ✅ ठीक किया गया नामकरण */}
              Go back home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ----------------- dashboard -----------------
  return (
    <div className="min-h-screen bg-background"> {/* ✅ ठीक किया गया `className` */}
      <Header /> {/* ✅ ठीक किया गया नामकरण */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> {/* ✅ ठीक किया गया `className` */}
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"> {/* ✅ ठीक किया गया `className` */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Seller Dashboard</h1> {/* ✅ ठीक किया गया नामकरण */}
            <p className="text-muted-foreground">Manage your products and orders</p> {/* ✅ ठीक किया गया `className` */}
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0"> {/* ✅ ठीक किया गया `className` */}
            {seller.approvalStatus === "approved" ? ( // ✅ ठीक किया गया नामकरण
              <Badge variant="default" className="bg-green-600"> {/* ✅ ठीक किया गया नामकरण */}
                <CheckCircle className="h-3 w-3 mr-1" /> {/* ✅ ठीक किया गया नामकरण */}
                Verified Seller
              </Badge>
            ) : seller.approvalStatus === "pending" ? ( // ✅ ठीक किया गया नामकरण
              <Badge variant="secondary"> {/* ✅ ठीक किया गया नामकरण */}
                <Clock className="h-3 w-3 mr-1" /> {/* ✅ ठीक किया गया नामकरण */}
                Pending Verification
              </Badge>
            ) : (
              <Badge variant="destructive"> {/* ✅ ठीक किया गया नामकरण */}
                <XCircle className="h-3 w-3 mr-1" /> {/* ✅ ठीक किया गया नामकरण */}
                Rejected ({seller.rejectionReason || "No reason specified"}) {/* ✅ ठीक किया गया नामकरण */}
              </Badge>
            )}
          </div>
        </div>

        {/* metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"> {/* ✅ ठीक किया गया `className` */}
          <Card> {/* ✅ ठीक किया गया नामकरण */}
            <CardContent className="p-6 flex items-center"> {/* ✅ ठीक किया गया नामकरण */}
              <TrendingUp className="h-8 w-8 text-primary" /> {/* ✅ ठीक किया गया नामकरण */}
              <div className="ml-4"> {/* ✅ ठीक किया गया `className` */}
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p> {/* ✅ ठीक किया गया नामकरण */}
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p> {/* ✅ ठीक किया गया नामकरण */}
              </div>
            </CardContent>
          </Card>
          <Card> {/* ✅ ठीक किया गया नामकरण */}
            <CardContent className="p-6 flex items-center"> {/* ✅ ठीक किया गया नामकरण */}
              <ShoppingCart className="h-8 w-8 text-secondary" /> {/* ✅ ठीक किया गया नामकरण */}
              <div className="ml-4"> {/* ✅ ठीक किया गया `className` */}
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p> {/* ✅ ठीक किया गया नामकरण */}
                <p className="text-2xl font-bold">{totalOrders}</p> {/* ✅ ठीक किया गया नामकरण */}
              </div>
            </CardContent>
          </Card>
          <Card> {/* ✅ ठीक किया गया नामकरण */}
            <CardContent className="p-6 flex items-center"> {/* ✅ ठीक किया गया नामकरण */}
              <Package className="h-8 w-8 text-yellow-600" /> {/* ✅ ठीक किया गया नामकरण */}
              <div className="ml-4"> {/* ✅ ठीक किया गया `className` */}
                <p className="text-sm font-medium text-muted-foreground">Products</p> {/* ✅ ठीक किया गया नामकरण */}
                <p className="text-2xl font-bold">{totalProducts}</p> {/* ✅ ठीक किया गया नामकरण */}
              </div>
            </CardContent>
          </Card>
          <Card> {/* ✅ ठीक किया गया नामकरण */}
            <CardContent className="p-6 flex items-center"> {/* ✅ ठीक किया गया नामकरण */}
              <Star className="h-8 w-8 text-yellow-500" /> {/* ✅ ठीक किया गया नामकरण */}
              <div className="ml-4"> {/* ✅ ठीक किया गया `className` */}
                <p className="text-sm font-medium text-muted-foreground">Rating</p> {/* ✅ ठीक किया गया नामकरण */}
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p> {/* ✅ ठीक किया गया नामकरण */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* tabs */}
        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="space-y-4"> {/* ✅ ठीक किया गया नामकरण */}
          <TabsList> {/* ✅ ठीक किया गया नामकरण */}
            <TabsTrigger value="products"> {/* ✅ ठीक किया गया नामकरण */}
              <Package className="h-4 w-4 mr-2" /> Products {/* ✅ ठीक किया गया नामकरण */}
            </TabsTrigger>
            <TabsTrigger value="orders"> {/* ✅ ठीक किया गया नामकरण */}
              <ShoppingCart className="h-4 w-4 mr-2" /> Orders {/* ✅ ठीक किया गया नामकरण */}
            </TabsTrigger>
            <TabsTrigger value="profile"> {/* ✅ ठीक किया गया नामकरण */}
              <Settings className="h-4 w-4 mr-2" /> Profile {/* ✅ ठीक किया गया नामकरण */}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products"> {/* ✅ ठीक किया गया नामकरण */}
            <ProductManager seller={seller} /> {/* ✅ ठीक किया गया नामकरण */}
          </TabsContent>

          <TabsContent value="orders"> {/* ✅ ठीक किया गया नामकरण */}
            <OrderManager seller={seller} orders={orders} isLoading={ordersLoading} error={ordersError} /> {/* ✅ ठीक किया गया नामकरण */}
          </TabsContent>

          <TabsContent value="profile"> {/* ✅ ठीक किया गया नामकरण */}
            <ProfileManager seller={seller} /> {/* ✅ ठीक किया गया नामकरण */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
  
