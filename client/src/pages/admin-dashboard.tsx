import { useEffect, useState } from "react";
import { apiRequest } from '../lib/queryClient';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

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

// ✅ New: Delivery Boy इंटरफ़ेस
interface DeliveryBoy {
  id: string;
  name: string;
  email: string;
  vehicleType: string;
  approvalStatus: string;
}

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // ✅ New: Delivery Boys के लिए स्टेट
  const [pendingDeliveryBoys, setPendingDeliveryBoys] = useState<DeliveryBoy[]>([]);
  
  const [activeTab, setActiveTab] = useState("vendors");
  const { toast } = useToast();

  const fetchVendors = async () => {
    try {
     const res = await apiRequest("GET", "/api/admin/vendors/sellers/pending");
      if (res && Array.isArray(res)) {
        setVendors(res);
        console.log("Fetched vendors for admin:", res);
      } else {
        setVendors([]);
        console.warn("API response for vendors is not an array:", res);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendors([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/products");
      if (res && Array.isArray(res)) {
        setProducts(res);
        console.log("Fetched products for admin:", res);
      } else {
        setProducts([]);
        console.warn("API response for products is not an array:", res);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  // ✅ New: डिलीवरी बॉय को फ़ेच करने का फंक्शन
  const fetchDeliveryBoys = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/delivery-boys/pending-applications");
      if (res && Array.isArray(res)) {
        setPendingDeliveryBoys(res);
        console.log("Fetched pending delivery boys for admin:", res);
      } else {
        setPendingDeliveryBoys([]);
        console.warn("API response for delivery boys is not an array:", res);
      }
    } catch (error) {
      console.error("Error fetching pending delivery boys:", error);
      setPendingDeliveryBoys([]);
    }
  };

  const approveVendor = async (vendorId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/vendors/approve/${vendorId}`, {});
      toast({ title: "Vendor approved successfully!" });
      fetchVendors();
    } catch (error: any) {
      console.error("Error approving vendor:", error);
      toast({ title: "Failed to approve vendor.", variant: "destructive" });
    }
  };

  const rejectVendor = async (vendorId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/vendors/reject/${vendorId}`, {});
      toast({ title: "Vendor rejected successfully!" });
      fetchVendors();
    } catch (error: any) {
      console.error("Error rejecting vendor:", error);
      toast({ title: "Failed to reject vendor.", variant: "destructive" });
    }
  };

  const approveProduct = async (productId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/products/approve/${productId}`, {});
      toast({ title: "Product approved successfully!" });
      fetchProducts();
    } catch (error: any) {
      console.error("Error approving product:", error);
      toast({ title: "Failed to approve product.", variant: "destructive" });
    }
  };

  const rejectProduct = async (productId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/products/reject/${productId}`, {});
      toast({ title: "Product rejected successfully!" });
      fetchProducts();
    } catch (error: any) {
      console.error("Error rejecting product:", error);
      toast({ title: "Failed to reject product.", variant: "destructive" });
    }
  };

  // ✅ New: डिलीवरी बॉय को अप्रूव और रिजेक्ट करने के फंक्शन
  const approveDeliveryBoy = async (id: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/delivery-boys/approve/${id}`, {});
      toast({ title: "Delivery boy approved successfully!" });
      fetchDeliveryBoys();
    } catch (error: any) {
      console.error("Error approving delivery boy:", error);
      toast({ title: "Failed to approve delivery boy.", variant: "destructive" });
    }
  };

  const rejectDeliveryBoy = async (id: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/delivery-boys/reject/${id}`, {});
      toast({ title: "Delivery boy rejected successfully!" });
      fetchDeliveryBoys();
    } catch (error: any) {
      console.error("Error rejecting delivery boy:", error);
      toast({ title: "Failed to reject delivery boy.", variant: "destructive" });
    }
  };


  useEffect(() => {
    fetchVendors();
    fetchProducts();
    fetchDeliveryBoys(); // ✅ New: डिलीवरी बॉय को फ़ेच करें
  }, []);

  return (
    <div className="p-4">
      <div className="flex space-x-4 mb-4">
        <Button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded ${activeTab === "vendors" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Vendors
        </Button>
        <Button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded ${activeTab === "products" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Products
        </Button>
        {/* ✅ New: डिलीवरी बॉय के लिए टैब */}
        <Button
          onClick={() => setActiveTab("delivery-boys")}
          className={`px-4 py-2 rounded ${activeTab === "delivery-boys" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Delivery Boys
        </Button>
      </div>

      {activeTab === "vendors" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Vendors</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Business Name</th>
                <th className="border px-4 py-2 text-left">Phone Number</th>
                <th className="border px-4 py-2 text-left">Status</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length > 0 ? (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{vendor.businessName}</td>
                    <td className="border px-4 py-2">{vendor.businessPhone}</td>
                    <td className="border px-4 py-2">{vendor.approvalStatus}</td>
                    <td className="border px-4 py-2 space-x-2">
                      {vendor.approvalStatus === 'pending' ? (
                        <>
                          <Button
                            onClick={() => approveVendor(vendor.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectVendor(vendor.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className={`font-semibold ${vendor.approvalStatus === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                          {vendor.approvalStatus.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="border px-4 py-4 text-center text-gray-500">
                    No vendors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "products" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Products</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Price</th>
                <th className="border px-4 py-2 text-left">Category</th>
                <th className="border px-4 py-2 text-left">Status</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{product.name}</td>
                    <td className="border px-4 py-2">{product.price}</td>
                    <td className="border px-4 py-2">{product.category}</td>
                    <td className="border px-4 py-2">{product.status}</td>
                    <td className="border px-4 py-2 space-x-2">
                      <Button
                        onClick={() => approveProduct(product.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectProduct(product.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="border px-4 py-4 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ New: डिलीवरी बॉय के लिए सेक्शन */}
      {activeTab === "delivery-boys" && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Pending Delivery Boy Applications</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Email</th>
                <th className="border px-4 py-2 text-left">Vehicle Type</th>
                <th className="border px-4 py-2 text-left">Status</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingDeliveryBoys.length > 0 ? (
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
                        onClick={() => approveDeliveryBoy(boy.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        onClick={() => rejectDeliveryBoy(boy.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
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
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
