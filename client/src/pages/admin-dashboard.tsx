import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useSocket } from "@/hooks/useSocket"; // ✅ socket import

// Interfaces
interface Vendor {
  id: number;
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface Product {
  id: number;
  name: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

interface DeliveryBoy {
  id: number;
  name: string;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

 const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending-vendors");
  const socket = useSocket(); // ✅ socket from context

  // ✅ socket.io real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("admin:vendor-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingVendors"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedVendors"] });
    });

    socket.on("admin:product-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedProducts"] });
    });

    socket.on("admin:deliveryboy-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingDeliveryBoys"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedDeliveryBoys"] });
    });

    return () => {
      socket.off("admin:vendor-updated");
      socket.off("admin:product-updated");
      socket.off("admin:deliveryboy-updated");
    };
  }, [socket, queryClient]);

  // Vendors API calls
  const { data: pendingVendors } = useQuery<Vendor[]>({
    queryKey: ["adminPendingVendors"],
    queryFn: async () => {
      const res = await api.get("/api/admin/vendors/pending");
      return res.data;
    },
  });

  const { data: approvedVendors } = useQuery<Vendor[]>({
    queryKey: ["adminApprovedVendors"],
    queryFn: async () => {
      const res = await api.get("/api/admin/vendors/approved");
      return res.data;
    },
  });

  // Products API calls
  const { data: pendingProducts } = useQuery<Product[]>({
    queryKey: ["adminPendingProducts"],
    queryFn: async () => {
      const res = await api.get("/api/admin/products/pending");
      return res.data;
    },
  });

  const { data: approvedProducts } = useQuery<Product[]>({
    queryKey: ["adminApprovedProducts"],
    queryFn: async () => {
      const res = await api.get("/api/admin/products/approved");
      return res.data;
    },
  });

  // Delivery Boys API calls
  const { data: pendingDeliveryBoys } = useQuery<DeliveryBoy[]>({
    queryKey: ["adminPendingDeliveryBoys"],
    queryFn: async () => {
      const res = await api.get("/api/admin/deliveryboys/pending");
      return res.data;
    },
  });

  const { data: approvedDeliveryBoys } = useQuery<DeliveryBoy[]>({
    queryKey: ["adminApprovedDeliveryBoys"],
    queryFn: async () => {
      const res = await api.get("/api/admin/deliveryboys/approved");
      return res.data;
    },
  });

  // Mutations
  const approveVendorMutation = useMutation({
    mutationFn: (vendorId: number) => api.post(`/api/admin/vendors/${vendorId}/approve`),
    onSuccess: () => {
      toast({ title: "Vendor Approved" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingVendors"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedVendors"] });
    },
  });

  const rejectVendorMutation = useMutation({
    mutationFn: (vendorId: number) => api.post(`/api/admin/vendors/${vendorId}/reject`, { reason: "Not eligible" }),
    onSuccess: () => {
      toast({ title: "Vendor Rejected" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingVendors"] });
    },
  });

  const approveProductMutation = useMutation({
    mutationFn: (productId: number) => api.post(`/api/admin/products/${productId}/approve`),
    onSuccess: () => {
      toast({ title: "Product Approved" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingProducts"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedProducts"] });
    },
  });

  const rejectProductMutation = useMutation({
    mutationFn: (productId: number) => api.post(`/api/admin/products/${productId}/reject`, { reason: "Not eligible" }),
    onSuccess: () => {
      toast({ title: "Product Rejected" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingProducts"] });
    },
  });

  const approveDeliveryBoyMutation = useMutation({
    mutationFn: (deliveryBoyId: number) => api.post(`/api/admin/deliveryboys/${deliveryBoyId}/approve`),
    onSuccess: () => {
      toast({ title: "Delivery Boy Approved" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingDeliveryBoys"] });
      queryClient.invalidateQueries({ queryKey: ["adminApprovedDeliveryBoys"] });
    },
  });

  const rejectDeliveryBoyMutation = useMutation({
    mutationFn: (deliveryBoyId: number) => api.post(`/api/admin/deliveryboys/${deliveryBoyId}/reject`, { reason: "Not eligible" }),
    onSuccess: () => {
      toast({ title: "Delivery Boy Rejected" });
      queryClient.invalidateQueries({ queryKey: ["adminPendingDeliveryBoys"] });
    },
  });

  // Render
  const renderContent = () => {
    switch (activeTab) {
      case "pending-vendors":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Pending Vendors</h2>
            {pendingVendors?.map((vendor) => (
              <div key={vendor.id} className="flex justify-between items-center bg-white p-2 rounded mb-2 shadow-sm">
                <span>{vendor.businessName}</span>
                <div>
                  <Button variant="success" size="sm" onClick={() => approveVendorMutation.mutate(vendor.id)}>
                    {approveVendorMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => rejectVendorMutation.mutate(vendor.id)} className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "approved-vendors":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Approved Vendors</h2>
            {approvedVendors?.map((vendor) => (
              <div key={vendor.id} className="bg-white p-2 rounded mb-2 shadow-sm">{vendor.businessName}</div>
            ))}
          </div>
        );

      case "pending-products":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Pending Products</h2>
            {pendingProducts?.map((product) => (
              <div key={product.id} className="flex justify-between items-center bg-white p-2 rounded mb-2 shadow-sm">
                <span>{product.name}</span>
                <div>
                  <Button variant="success" size="sm" onClick={() => approveProductMutation.mutate(product.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => rejectProductMutation.mutate(product.id)} className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "approved-products":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Approved Products</h2>
            {approvedProducts?.map((product) => (
              <div key={product.id} className="bg-white p-2 rounded mb-2 shadow-sm">{product.name}</div>
            ))}
          </div>
        );

      case "pending-deliveryboys":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Pending Delivery Boys</h2>
            {pendingDeliveryBoys?.map((dboy) => (
              <div key={dboy.id} className="flex justify-between items-center bg-white p-2 rounded mb-2 shadow-sm">
                <span>{dboy.name}</span>
                <div>
                  <Button variant="success" size="sm" onClick={() => approveDeliveryBoyMutation.mutate(dboy.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => rejectDeliveryBoyMutation.mutate(dboy.id)} className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "approved-deliveryboys":
        return (
          <div>
            <h2 className="text-lg font-semibold mb-2">Approved Delivery Boys</h2>
            {approvedDeliveryBoys?.map((dboy) => (
              <div key={dboy.id} className="bg-white p-2 rounded mb-2 shadow-sm">{dboy.name}</div>
            ))}
          </div>
        );

      default:
        return <p>Select a tab</p>;
    }
  };

   return (
    <div className="p-4 bg-gray-50 min-h-screen font-inter">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="flex space-x-4 mb-6">
        <Button onClick={() => setActiveTab("pending-vendors")}>Pending Vendors</Button>
        <Button onClick={() => setActiveTab("approved-vendors")}>Approved Vendors</Button>
        <Button onClick={() => setActiveTab("pending-products")}>Pending Products</Button>
        <Button onClick={() => setActiveTab("approved-products")}>Approved Products</Button>
        <Button onClick={() => setActiveTab("pending-deliveryboys")}>Pending Delivery Boys</Button>
        <Button onClick={() => setActiveTab("approved-deliveryboys")}>Approved Delivery Boys</Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default AdminDashboard;
