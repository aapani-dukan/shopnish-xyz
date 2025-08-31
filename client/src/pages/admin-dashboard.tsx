import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import api from "@/lib/api";

// ✅ इंटरफेस
interface Vendor {
  id: string;
  businessName: string;
  businessPhone: string;
  approvalStatus: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  // ✅ status की जगह approvalStatus का उपयोग करें
  approvalStatus: string;
}

interface DeliveryBoy {
  id: string;
  name: string;
  email: string;
  vehicleType: string;
  approvalStatus: string;
}

const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending-vendors");

  // ✅ डेटा फेचिंग (अब सही एडमिन API का उपयोग करके)
  const { data: pendingVendors = [], isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ["adminPendingVendors"],
    queryFn: async () => {
      const res = await api.get("/api/vendors/pending");
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: approvedVendors = [], isLoading: isLoadingApprovedVendors } = useQuery<Vendor[]>({
    queryKey: ["adminApprovedVendors"],
    queryFn: async () => {
      const res = await api.get("/api/vendors/approved");
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
  });

  // ✅ अब products को fetch करने के लिए सही admin API का उपयोग करें
  const { data: pendingProducts = [], isLoading: isLoadingPendingProducts } = useQuery<Product[]>({
    queryKey: ["adminPendingProducts"],
    queryFn: async () => {
      const res = await api.get("/api/admin/products?status=pending");
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: approvedProducts = [], isLoading: isLoadingApprovedProducts } = useQuery<Product[]>({
    queryKey: ["adminApprovedProducts"],
    queryFn: async () => {
      const res = await api.get("/api/admin/products?status=approved");
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
  });


  const { data: pendingDeliveryBoys = [], isLoading: isLoadingDeliveryBoys } = useQuery<DeliveryBoy[]>({
    queryKey: ["adminDeliveryBoys"],
    queryFn: async () => {
      const res = await api.get("/api/delivery-boys/pending-applications");
      return res.data && Array.isArray(res.data) ? res.data : [];
    },
  });


  // ✅ म्यूटेशन (अब सही एडमिन API का उपयोग करके)
  const approveVendorMutation = useMutation({
    mutationFn: (vendorId: string) => api.patch(`/api/vendors/approve/${vendorId}`),
    onSuccess: () => {
      toast({ title: "वेंडर मंज़ूर हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingVendors"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedVendors"] });
    },
    onError: (error: any) => {
      console.error("वेंडर मंज़ूर करने में त्रुटि:", error);
      toast({ title: "वेंडर मंज़ूर करने में विफल", variant: "destructive" });
    },
  });

  const rejectVendorMutation = useMutation({
    mutationFn: (vendorId: string) => api.patch(`/api/vendors/reject/${vendorId}`),
    onSuccess: () => {
      toast({ title: "वेंडर अस्वीकृत हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingVendors"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedVendors"] });
    },
    onError: (error: any) => {
      console.error("वेंडर अस्वीकार करने में त्रुटि:", error);
      toast({ title: "वेंडर अस्वीकार करने में विफल", variant: "destructive" });
    },
  });
  
  // ✅ अब सही admin API का उपयोग करें
  const approveProductMutation = useMutation({
    mutationFn: (productId: string) => api.patch(`/api/admin/products/approve/${productId}`),
    onSuccess: () => {
      toast({ title: "प्रोडक्ट मंज़ूर हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedProducts"] });
    },
    onError: (error: any) => {
      console.error("प्रोडक्ट मंज़ूर करने में त्रुटि:", error);
      toast({ title: "प्रोडक्ट मंज़ूर करने में विफल", variant: "destructive" });
    },
  });

  // ✅ अब सही admin API का उपयोग करें
  const rejectProductMutation = useMutation({
    mutationFn: (productId: string) => api.patch(`/api/admin/products/reject/${productId}`),
    onSuccess: () => {
      toast({ title: "प्रोडक्ट अस्वीकृत हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedProducts"] });
    },
    onError: (error: any) => {
      console.error("प्रोडक्ट अस्वीकार करने में त्रुटि:", error);
      toast({ title: "प्रोडक्ट अस्वीकार करने में विफल", variant: "destructive" });
    },
  });

  const approveDeliveryBoyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/delivery-boys/approve/${id}`),
    onSuccess: () => {
      toast({ title: "डिलीवरी बॉय मंज़ूर हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveryBoys"] });
    },
    onError: (error: any) => {
      console.error("डिलीवरी बॉय मंज़ूर करने में त्रुटि:", error);
      toast({ title: "डिलीवरी बॉय मंज़ूर करने में विफल", variant: "destructive" });
    },
  });

  const rejectDeliveryBoyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/delivery-boys/reject/${id}`),
    onSuccess: () => {
      toast({ title: "डिलीवरी बॉय अस्वीकृत हुआ!" });
      queryClient.invalidateQueries({ queryKey: ["adminDeliveryBoys"] });
    },
    onError: (error: any) => {
      console.error("डिलीवरी बॉय अस्वीकार करने में त्रुटि:", error);
      toast({ title: "डिलीवरी बॉय अस्वीकार करने में विफल", variant: "destructive" });
    },
  });
  const renderContent = () => {
    switch (activeTab) {
      case 'pending-vendors':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">पेंडिंग वेंडर एप्लिकेशन</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">व्यापार का नाम</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">फ़ोन नंबर</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">स्थिति</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">एक्शन</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingVendors ? (
                    <tr><td colSpan={4} className="border px-4 py-4 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> लोडिंग...</td></tr>
                  ) : pendingVendors.length > 0 ? (
                    pendingVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{vendor.businessName}</td>
                        <td className="border px-4 py-2">{vendor.businessPhone}</td>
                        <td className="border px-4 py-2">{vendor.approvalStatus}</td>
                        <td className="border px-4 py-2 space-x-2">
                          {vendor.approvalStatus === 'pending' && (
                            <>
                              <Button onClick={() => approveVendorMutation.mutate(vendor.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm" disabled={approveVendorMutation.isPending}><Check size={16} /></Button>
                              <Button onClick={() => rejectVendorMutation.mutate(vendor.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm" disabled={rejectVendorMutation.isPending}><X size={16} /></Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="border px-4 py-4 text-center text-gray-500">कोई लंबित वेंडर एप्लिकेशन नहीं हैं।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
        case 'approved-vendors':
          return (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">स्वीकृत वेंडर</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">व्यापार का नाम</th>
                      <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">फ़ोन नंबर</th>
                      <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingApprovedVendors ? (
                      <tr><td colSpan={3} className="border px-4 py-4 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> लोडिंग...</td></tr>
                    ) : approvedVendors.length > 0 ? (
                      approvedVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          <td className="border px-4 py-2">{vendor.businessName}</td>
                          <td className="border px-4 py-2">{vendor.businessPhone}</td>
                          <td className="border px-4 py-2">{vendor.approvalStatus}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="border px-4 py-4 text-center text-gray-500">कोई स्वीकृत वेंडर नहीं हैं।</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
      case 'pending-products':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">पेंडिंग प्रोडक्ट अप्रूवल</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">नाम</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">कीमत</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">स्थिति</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">एक्शन</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingPendingProducts ? (
                    <tr><td colSpan={4} className="border px-4 py-4 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> लोडिंग...</td></tr>
                  ) : pendingProducts.length > 0 ? (
                    pendingProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{product.name}</td>
                        <td className="border px-4 py-2">₹{product.price}</td>
                        <td className="border px-4 py-2">{product.approvalStatus}</td>
                        <td className="border px-4 py-2 space-x-2">
                          <Button onClick={() => approveProductMutation.mutate(product.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm" disabled={approveProductMutation.isPending}><Check size={16} /></Button>
                          <Button onClick={() => rejectProductMutation.mutate(product.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm" disabled={rejectProductMutation.isPending}><X size={16} /></Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="border px-4 py-4 text-center text-gray-500">कोई पेंडिंग प्रोडक्ट नहीं मिले।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'approved-products':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">स्वीकृत प्रोडक्ट</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">नाम</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">कीमत</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingApprovedProducts ? (
                    <tr><td colSpan={3} className="border px-4 py-4 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> लोडिंग...</td></tr>
                  ) : approvedProducts.length > 0 ? (
                    approvedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{product.name}</td>
                        <td className="border px-4 py-2">₹{product.price}</td>
                        <td className="border px-4 py-2">{product.approvalStatus}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="border px-4 py-4 text-center text-gray-500">कोई स्वीकृत प्रोडक्ट नहीं हैं।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'delivery-boys':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">पेंडिंग डिलीवरी बॉय एप्लिकेशन</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">नाम</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">ईमेल</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">वाहन का प्रकार</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">स्थिति</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium text-gray-700">एक्शन</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDeliveryBoys ? (
                    <tr><td colSpan={5} className="border px-4 py-4 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> लोडिंग...</td></tr>
                  ) : pendingDeliveryBoys.length > 0 ? (
                    pendingDeliveryBoys.map((boy) => (
                      <tr key={boy.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{boy.name}</td>
                        <td className="border px-4 py-2">{boy.email}</td>
                        <td className="border px-4 py-2">{boy.vehicleType}</td>
                        <td className="border px-4 py-2"><span className="font-semibold text-yellow-500">पेंडिंग</span></td>
                        <td className="border px-4 py-2 space-x-2">
                          <Button onClick={() => approveDeliveryBoyMutation.mutate(boy.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm" disabled={approveDeliveryBoyMutation.isPending}><Check size={16} /></Button>
                          <Button onClick={() => rejectDeliveryBoyMutation.mutate(boy.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm" disabled={rejectDeliveryBoyMutation.isPending}><X size={16} /></Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="border px-4 py-4 text-center text-gray-500">कोई पेंडिंग डिलीवरी बॉय एप्लिकेशन नहीं हैं।</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-inter">
      <div className="flex flex-wrap space-x-2 space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
        <Button onClick={() => setActiveTab("pending-vendors")} className={`px-4 py-2 rounded ${activeTab === "pending-vendors" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
          पेंडिंग वेंडर
        </Button>
        <Button onClick={() => setActiveTab("approved-vendors")} className={`px-4 py-2 rounded ${activeTab === "approved-vendors" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
          स्वीकृत वेंडर
        </Button>
        <Button onClick={() => setActiveTab("pending-products")} className={`px-4 py-2 rounded ${activeTab === "pending-products" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
          पेंडिंग प्रोडक्ट
        </Button>
        <Button onClick={() => setActiveTab("approved-products")} className={`px-4 py-2 rounded ${activeTab === "approved-products" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
          स्वीकृत प्रोडक्ट
        </Button>
        <Button onClick={() => setActiveTab("delivery-boys")} className={`px-4 py-2 rounded ${activeTab === "delivery-boys" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
          डिलीवरी बॉय
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default AdminDashboard;

                                                                                                                                                                                                                                
