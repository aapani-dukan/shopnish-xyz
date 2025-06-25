// client/src/pages/seller-dashboard.tsx
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // Label अभी भी उपयोग में नहीं है, लेकिन इसे रखा है
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // DialogDescription को जोड़ा
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// ✅ insertProductSchema में userId प्रॉपर्टी नहीं होनी चाहिए, क्योंकि यह सर्वर पर जुड़ेगी
// ✅ sellerFormSchema में userId को omit करना सही है
import { insertProductSchema, insertSellerSchema, insertCategorySchema } from "@shared/backend/schema";
import type { Seller, ProductWithSeller, Category, OrderWithItems } from "@shared/backend/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Star, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  Settings,
  XCircle // ✅ रद्द करने के लिए नया आइकन
} from "lucide-react";
import { useEffect, useState } from "react"; // ✅ useEffect को इम्पोर्ट करें
import { z } from "zod";

// ✅ ProductFormSchema को अपडेट किया गया: price और originalPrice अब string के बजाय number होंगे
const productFormSchema = insertProductSchema.extend({
  images: z.array(z.string()).optional(),
  // ✅ price और originalPrice को numbers के रूप में पार्स करें, string के रूप में नहीं
  price: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Price must be a positive number")
  ),
  originalPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Original price must be a positive number").optional()
  ),
  stock: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, "Stock cannot be negative").default(0)
  ),
});

// ✅ SellerFormSchema: userId को omit करना जारी रखें क्योंकि यह बैकएंड पर जुड़ता है
const sellerFormSchema = insertSellerSchema.omit({ userId: true });
const categoryFormSchema = insertCategorySchema;

export default function SellerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSeller | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("products"); // ✅ एक्टिव टैब को मैनेज करने के लिए स्टेट

  // Fetch seller profile
  const { data: seller, isLoading: sellerLoading, error: sellerError } = useQuery<Seller>({ // ✅ एरर हैंडलिंग के लिए error जोड़ा
    queryKey: ["/api/sellers/me"],
    queryFn: () => apiRequest("GET", "/api/sellers/me"), // ✅ queryFn को स्पष्ट रूप से परिभाषित करें
    staleTime: 5 * 60 * 1000,
  });

  // Fetch seller's products
  const { data: products, isLoading: productsLoading, error: productsError } = useQuery<ProductWithSeller[]>({ // ✅ एरर हैंडलिंग के लिए error जोड़ा
    queryKey: ["/api/products", { sellerId: seller?.id }],
    queryFn: () => apiRequest("GET", "/api/products", { params: { sellerId: seller?.id } }), // ✅ queryFn और params का उपयोग करें
    enabled: !!seller?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch seller's orders
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<OrderWithItems[]>({ // ✅ एरर हैंडलिंग के लिए error जोड़ा
    queryKey: ["/api/seller/orders"],
    queryFn: () => apiRequest("GET", "/api/seller/orders"), // ✅ queryFn को स्पष्ट रूप से परिभाषित करें
    enabled: !!seller?.id,
    staleTime: 0, // ऑर्डर्स को अक्सर अपडेट किया जाना चाहिए
    refetchInterval: 60 * 1000, // हर 1 मिनट में ऑर्डर्स को री-फ़ेच करें
  });

  // Fetch categories for product form
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({ // ✅ एरर हैंडलिंग के लिए error जोड़ा
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("GET", "/api/categories"), // ✅ queryFn को स्पष्ट रूप से परिभाषित करें
    staleTime: Infinity, // श्रेणियाँ शायद ही कभी बदलती हैं, इसलिए उन्हें हमेशा ताज़ा मानें
  });

  // Product form
  const productForm = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: undefined, // ✅ undefined default, not empty string
      originalPrice: undefined, // ✅ undefined default
      categoryId: undefined,
      stock: 0,
      images: [],
    },
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      isActive: true,
    },
  });

  // Seller form
  const sellerForm = useForm<z.infer<typeof sellerFormSchema>>({
    resolver: zodResolver(sellerFormSchema),
    // ✅ seller डेटा लोड होने पर ही defaultValues सेट करें
    values: seller ? { // ✅ `values` का उपयोग करें ताकि यह React Query डेटा के साथ सिंक में रहे
      businessName: seller.businessName || "",
      description: seller.description || "",
      businessAddress: seller.businessAddress || "",
      businessPhone: seller.businessPhone || "",
      gstNumber: seller.gstNumber || "",
      bankAccountNumber: seller.bankAccountNumber || "",
      ifscCode: seller.ifscCode || "",
      // सुनिश्चित करें कि seller.businessType भी है और यहाँ शामिल है यदि आप इसे फॉर्म में अपडेट करना चाहते हैं
      // businessType: seller.businessType || "individual" // अगर आपकी स्कीमा में है
    } : { // ✅ यदि seller डेटा अभी लोड नहीं हुआ है तो खाली डिफ़ॉल्ट प्रदान करें
      businessName: "",
      description: "",
      businessAddress: "",
      businessPhone: "",
      gstNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
    },
  });

  // Create/Update product mutation
  const productMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      // ✅ प्राइस को नंबर में कन्वर्ट करें
      const payload = {
        ...data,
        price: Number(data.price),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        stock: Number(data.stock),
      };

      if (editingProduct) {
        return await apiRequest("PUT", `/api/products/${editingProduct.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/products", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: editingProduct ? "Product updated" : "Product created",
        description: `Product has been ${editingProduct ? "updated" : "created"} successfully`,
      });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset(); // ✅ फ़ॉर्म रीसेट करें
    },
    onError: (error: any) => { // ✅ error टाइप जोड़ें
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${editingProduct ? "update" : "create"} product`,
        variant: "destructive",
      });
    },
  });

  // Update seller mutation
  const sellerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sellerFormSchema>) => {
      return await apiRequest("PUT", "/api/sellers/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      toast({
        title: "Profile updated",
        description: "Your seller profile has been updated successfully",
      });
    },
    onError: (error: any) => { // ✅ error टाइप जोड़ें
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update seller profile",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully",
      });
    },
    onError: (error: any) => { // ✅ error टाइप जोड़ें
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Category creation mutation
  const categoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categoryFormSchema>) => {
      return await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category created",
        description: "Category has been created successfully",
      });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: (error: any) => { // ✅ error टाइप जोड़ें
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const onProductSubmit = (data: z.infer<typeof productFormSchema>) => {
    productMutation.mutate(data);
  };

  const onSellerSubmit = (data: z.infer<typeof sellerFormSchema>) => {
    sellerMutation.mutate(data);
  };

  const onCategorySubmit = (data: z.infer<typeof categoryFormSchema>) => {
    categoryMutation.mutate(data);
  };

  const handleEditProduct = (product: ProductWithSeller) => {
    setEditingProduct(product);
    // ✅ Form values को संख्या के रूप में सेट करें
    productForm.reset({
      name: product.name,
      description: product.description || "",
      price: parseFloat(product.price as any), // ✅ सुनिश्चित करें कि यह number है
      originalPrice: product.originalPrice ? parseFloat(product.originalPrice as any) : undefined, // ✅ सुनिश्चित करें कि यह number है
      categoryId: product.categoryId,
      stock: product.stock || 0,
      images: product.images || [],
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (productId: number) => {
    // ✅ टोस्ट के साथ एक अधिक यूजर-फ्रेंडली कन्फर्मेशन डायलॉग का उपयोग करें
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this product? This action cannot be undone.",
      variant: "destructive",
      action: (
        <div className="flex gap-2">
          <Button onClick={() => deleteProductMutation.mutate(productId)} className="bg-red-500 hover:bg-red-600 text-white">
            Delete
          </Button>
          <Button onClick={() => toast({})} variant="outline">
            Cancel
          </Button>
        </div>
      ),
      duration: 10000, // लंबे समय तक दिखाएं ताकि यूजर कार्रवाई कर सके
    });
  };

  // Calculate dashboard metrics
  // ✅ parseFloat का उपयोग करें क्योंकि डेटा स्ट्रिंग के रूप में आ सकता है
  const totalRevenue = orders?.reduce((sum, order) => 
    sum + order.orderItems.reduce((itemSum, item) => 
      itemSum + parseFloat(item.total), 0
    ), 0
  ) || 0;

  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;
  // ✅ seller.rating स्ट्रिंग हो सकता है, इसे number में कन्वर्ट करें
  const averageRating = parseFloat(seller?.rating || "0"); 

  // Initial load or seller profile not found scenarios
  if (sellerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <Skeleton className="h-8 w-64 mb-6" /> {/* Title Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" /> 
              ))}
            </div>
            <Skeleton className="h-10 w-full mb-4 rounded-md" /> {/* Tabs List Skeleton */}
            <Skeleton className="h-96 w-full rounded-xl" /> {/* Content Area Skeleton */}
          </div>
        </div>
      </div>
    );
  }

  // ✅ यदि seller डेटा लोड हो गया है लेकिन कोई seller ऑब्जेक्ट नहीं है (404)
  if (sellerError || !seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="text-6xl mb-4">
            {sellerError ? <XCircle className="w-20 h-20 text-red-500 mx-auto" /> : "🏪"} {/* ✅ एरर पर अलग आइकन */}
          </div>
          <h2 className="text-2xl font-bold mb-4">{sellerError ? "Error Loading Profile" : "Seller Profile Not Found"}</h2>
          <p className="text-muted-foreground mb-6">
            {sellerError ? "There was an issue fetching your seller profile. Please try again." : "It looks like you haven't set up your seller profile yet or it's not approved."}
          </p>
          <Button onClick={() => window.location.href = "/seller-apply"}> {/* ✅ seller-apply पेज पर रीडायरेक्ट करें */}
            {sellerError ? "Retry" : "Apply to be a Seller"}
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = "/"} className="ml-4">
            Go Back Home
          </Button>
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
            {seller.approvalStatus === "approved" ? ( // ✅ approvalStatus का उपयोग करें
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"> {/* ✅ ग्रिड को 2 या 4 कॉलम में एडजस्ट करें */}
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
                  <p className="text-2xl font-bold">{totalProducts}</p>
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
        {/* ✅ `activeTab` स्टेट का उपयोग करें और `onValueChange` जोड़ें */}
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

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Your Products</CardTitle>
                  <div className="flex gap-2">
                    {/* ✅ यदि सेलर सत्यापित नहीं है, तो प्रोडक्ट और श्रेणी बनाने को रोकें */}
                    {seller.approvalStatus === "approved" ? (
                      <>
                        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => {
                              categoryForm.reset();
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Category
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Category</DialogTitle>
                              <DialogDescription>
                                Add a new product category to organize your items.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...categoryForm}>
                              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                                <FormField
                                  control={categoryForm.control}
                                  name="name"
                                render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={categoryForm.control}
                                  name="slug"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category Slug</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., electronics" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={categoryForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description (Optional)</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={categoryForm.control}
                                  name="imageUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Image URL (Optional)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="url" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsCategoryDialogOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={categoryMutation.isPending}>
                                    {categoryMutation.isPending ? "Creating..." : "Create Category"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                          <DialogTrigger asChild>
                            <Button onClick={() => {
                              setEditingProduct(null);
                              productForm.reset();
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Product
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {editingProduct ? "Edit Product" : "Add New Product"}
                            </DialogTitle>
                            <DialogDescription>
                              {editingProduct ? "Update details for your product." : "Add a new product to your inventory."}
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...productForm}>
                            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                              <FormField
                                control={productForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={productForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* ✅ ग्रिड को एडजस्ट किया */}
                                <FormField
                                  control={productForm.control}
                                  name="price"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Price (₹)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="number" step="0.01" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={productForm.control}
                                  name="originalPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Original Price (₹) (Optional)</FormLabel> {/* ✅ लेबल को ठीक किया */}
                                        <FormControl>
                                            <Input {...field} type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                  control={productForm.control}
                                  name="categoryId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value?.toString()}> {/* ✅ वैल्यू को स्ट्रिंग में कन्वर्ट करें */}
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {categories?.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}> {/* ✅ वैल्यू को स्ट्रिंग में कन्वर्ट करें */}
                                              {category.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={productForm.control}
                                  name="stock"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stock</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="number" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Images Field (Optional - you might need a proper image upload component) */}
                              <FormField
                                control={productForm.control}
                                name="images"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Image URLs (Comma Separated)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        value={field.value?.join(", ") || ""}
                                        onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="https://example.com/image1.jpg, https://example.com/image2.png"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setIsProductDialogOpen(false);
                                    setEditingProduct(null);
                                    productForm.reset();
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={productMutation.isPending}>
                                  {productMutation.isPending ? (editingProduct ? "Updating..." : "Adding...") : (editingProduct ? "Update Product" : "Add Product")}
                                </Button>
                              </div>
                            </form>
                          </Form>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-orange-500">
                        <Info className="h-4 w-4 mr-2" />
                        Verify account to add products
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : productsError ? ( // ✅ Error display for products
                  <p className="text-red-500">Error loading products: {productsError.message}</p>
                ) : products && products.length === 0 ? (
                  <p className="text-muted-foreground">You haven't added any products yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.map((product) => (
                      <Card key={product.id} className="relative group overflow-hidden">
                        {product.images && product.images.length > 0 && (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        )}
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-lg line-clamp-1">{product.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-lg font-bold text-primary">₹{product.price}</p>
                            <Badge variant="secondary">{product.stock} in stock</Badge>
                          </div>
                          <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                  </div>
                ) : ordersError ? ( // ✅ Error display for orders
                  <p className="text-red-500">Error loading orders: {ordersError.message}</p>
                ) : orders && orders.length === 0 ? (
                  <p className="text-muted-foreground">No orders yet.</p>
                ) : (
                  <div className="space-y-4">
                    {orders?.map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold">Order ID: {order.id}</h4>
                          <Badge 
                            variant={
                              order.status === "pending" 
                                ? "secondary" 
                                : order.status === "completed" 
                                  ? "default" 
                                  : "destructive"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Total: ₹{parseFloat(order.total).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Ordered On: {new Date(order.createdAt).toLocaleString()}</p>
                        <div className="mt-2">
                          <h5 className="font-medium text-sm mb-1">Items:</h5>
                          <ul className="list-disc list-inside text-sm">
                            {order.orderItems.map((item) => (
                              <li key={item.id}>{item.productName} ({item.quantity} x ₹{item.price})</li>
                            ))}
                          </ul>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...sellerForm}>
                  <form onSubmit={sellerForm.handleSubmit(onSellerSubmit)} className="space-y-4">
                    <FormField
                      control={sellerForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="gstNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={sellerForm.control}
                      name="ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={sellerMutation.isPending}>
                      {sellerMutation.isPending ? "Saving..." : "Save Profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


                    
  
                          
