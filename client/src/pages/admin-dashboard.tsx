import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Check, X, Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ✅ Vendor इंटरफ़ेस को आपके डेटाबेस स्कीमा के अनुसार अपडेट किया गया
interface Vendor {
  id: string; 
  businessName: string;
  businessPhone: string;
  approvalStatus: string;
}

// ✅ Product इंटरफ़ेस को आपके डेटाबेस स्कीमा के अनुसार अपडेट किया गया
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  status: string;
}

// ✅ Delivery Boy इंटरफ़ेस
interface DeliveryBoy {
  id: string;
  name: string;
  email: string;
  vehicleType: string;
  approvalStatus: string;
}

// ✅ New: Category इंटरफ़ेस
interface Category {
  id: number;
  name: string;
  nameHindi?: string;
  slug: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
}

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("vendors");
  const [formState, setFormState] = useState({
    name: '',
    nameHindi: '',
    slug: '',
    description: '',
    image: null as File | null,
    isActive: true,
    sortOrder: 0,
  });

  const generateSlug = (text: string) => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0900-\u097F]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setFormState({ ...formState, [name]: file });
    } else {
      setFormState({ ...formState, [name]: value });
      if (name === 'name') {
        setFormState(prevState => ({
          ...prevState,
          slug: generateSlug(value),
        }));
      }
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormState(prevState => ({ ...prevState, isActive: checked }));
  };

  // ✅ useQuery Hooks for Fetching Data
  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ["adminVendors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/vendors/sellers/pending");
      return res && Array.isArray(res) ? res : [];
    },
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["adminProducts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/products");
      return res && Array.isArray(res) ? res : [];
    },
  });

  const { data: pendingDeliveryBoys = [], isLoading: isLoadingDeliveryBoys } = useQuery<DeliveryBoy[]>({
    queryKey: ["adminDeliveryBoys"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/delivery-boys/pending-applications");
      return res && Array.isArray(res) ? res : [];
    },
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["adminCategories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/categories");
      return res && Array.isArray(res) ? res : [];
    },
  });

  // ✅ useMutation Hooks for Actions
  const approveVendorMutation = useMutation({
    mutationFn: (vendorId: string) => apiRequest("PATCH", `/api/admin/vendors/approve/${vendorId}`, {}),
    onSuccess: () => {
      toast({ title: "Vendor approved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
    },
    onError: (error: any) => {
      console.error("Error approving vendor:", error);
      toast({ title: "Failed to approve vendor.", variant: "destructive" });
    },
  });

  const rejectVendorMutation = useMutation({
    mutationFn: (vendorId: string) => apiRequest("PATCH", `/api/admin/vendors/reject/${vendorId}`, {}),
    onSuccess: () => {
      toast({ title: "Vendor rejected successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
    },
    onError: (error: any) => {
      console.error("Error rejecting vendor:", error);
      toast({ title: "Failed to reject vendor.", variant: "destructive" });
    },
  });
  
  const approveProductMutation = useMutation({
    mutationFn: (productId: string) => apiRequest("PATCH", `/api/admin/products/approve/${productId}`, {}),
    onSuccess: () => {
      toast({ title: "Product approved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: any) => {
      console.error("Error approving product:", error);
      toast({ title: "Failed to approve product.", variant: "destructive" });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: (productId: string) => apiRequest("PATCH", `/api/admin/products/reject/${productId}`, {}),
    onSuccess: () => {
      toast({ title: "Product rejected successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (error: any) => {
      console.error("Error rejecting product:", error);
      toast({ title: "Failed to reject product.", variant: "destructive" });
    },
  });

  const approveDeliveryBoyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/delivery-boys/approve/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Delivery boy approved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveryBoys"] });
    },
    onError: (error: any) => {
      console.error("Error approving delivery boy:", error);
      toast({ title: "Failed to approve delivery boy.", variant: "destructive" });
    },
  });

  const rejectDeliveryBoyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/delivery-boys/reject/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Delivery boy rejected successfully!" });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveryBoys"] });
    },
    onError: (error: any) => {
      console.error("Error rejecting delivery boy:", error);
      toast({ title: "Failed to reject delivery boy.", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('name', formState.name);
      formData.append('nameHindi', formState.nameHindi);
      formData.append('slug', formState.slug);
      formData.append('description', formState.description);
      formData.append('isActive', String(formState.isActive));
      formData.append('sortOrder', String(formState.sortOrder));
      if (formState.image) {
        formData.append('image', formState.image);
      }
      return await apiRequest('POST', '/api/admin/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast({
        title: '✅ Category created!',
        description: `New category "${formState.name}" has been added.`,
      });
      setFormState({
        name: '',
        nameHindi: '',
        slug: '',
        description: '',
        image: null,
        isActive: true,
        sortOrder: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      setActiveTab('view-categories');
    },
    onError: (error: any) => {
      console.error('❌ Error creating category:', error);
      toast({
        title: '❌ Failed to create category',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate();
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800">Admin Dashboard</h1>
        <Button onClick={() => navigate('/products')} variant="outline" className="flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </Button>
      </div>
      
      <div className="flex space-x-4 mb-4">
        <Button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded ${activeTab === "vendors" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Vendors
        </Button>
        <Button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded ${activeTab === "products" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Products
        </Button>
        <Button
          onClick={() => setActiveTab("delivery-boys")}
          className={`px-4 py-2 rounded ${activeTab === "delivery-boys" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Delivery Boys
        </Button>
        <Button
          onClick={() => setActiveTab("view-categories")}
          className={`px-4 py-2 rounded ${activeTab === "view-categories" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          View Categories
        </Button>
        <Button
          onClick={() => setActiveTab("create-category")}
          className={`px-4 py-2 rounded ${activeTab === "create-category" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
        >
          Create Category
        </Button>
      </div>

      {activeTab === "vendors" && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Pending Vendor Applications</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Business Name</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Phone Number</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingVendors ? (
                <tr>
                  <td colSpan={4} className="border px-4 py-4 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading...
                  </td>
                </tr>
              ) : (
                vendors.length > 0 ? (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{vendor.businessName}</td>
                      <td className="border px-4 py-2">{vendor.businessPhone}</td>
                      <td className="border px-4 py-2">{vendor.approvalStatus}</td>
                      <td className="border px-4 py-2 space-x-2">
                        {vendor.approvalStatus === 'pending' && (
                          <>
                            <Button
                              onClick={() => approveVendorMutation.mutate(vendor.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
                              disabled={approveVendorMutation.isPending}
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              onClick={() => rejectVendorMutation.mutate(vendor.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                              disabled={rejectVendorMutation.isPending}
                            >
                              <X size={16} />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border px-4 py-4 text-center text-gray-500">
                      No pending vendor applications.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Pending Product Approvals</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProducts ? (
                <tr>
                  <td colSpan={5} className="border px-4 py-4 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading...
                  </td>
                </tr>
              ) : (
                products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{product.name}</td>
                      <td className="border px-4 py-2">₹{product.price}</td>
                      <td className="border px-4 py-2">{product.category}</td>
                      <td className="border px-4 py-2">{product.status}</td>
                      <td className="border px-4 py-2 space-x-2">
                        <Button
                          onClick={() => approveProductMutation.mutate(product.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
                          disabled={approveProductMutation.isPending}
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          onClick={() => rejectProductMutation.mutate(product.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                          disabled={rejectProductMutation.isPending}
                        >
                          <X size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border px-4 py-4 text-center text-gray-500">
                      No pending products found.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "delivery-boys" && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Pending Delivery Boy Applications</h2>
          <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Vehicle Type</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingDeliveryBoys ? (
                <tr>
                  <td colSpan={5} className="border px-4 py-4 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Loading...
                  </td>
                </tr>
              ) : (
                pendingDeliveryBoys.length > 0 ? (
                  pendingDeliveryBoys.map((boy) => (
                    <tr key={boy.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{boy.name}</td>
                      <td className="border px-4 py-2">{boy.email}</td>
                      <td className="border px-4 py-2">{boy.vehicleType}</td>
                      <td className="border px-4 py-2">
                          <span className="font-semibold text-yellow-500">PENDING</span>
                      </td>
                      <td className="border px-4 py-2 space-x-2">
                        <Button
                          onClick={() => approveDeliveryBoyMutation.mutate(boy.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm"
                          disabled={approveDeliveryBoyMutation.isPending}
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          onClick={() => rejectDeliveryBoyMutation.mutate(boy.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                          disabled={rejectDeliveryBoyMutation.isPending}
                        >
                          <X size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border px-4 py-4 text-center text-gray-500">
                      No pending delivery boy applications.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'view-categories' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Existing Categories</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">Name (EN)</th>
  
