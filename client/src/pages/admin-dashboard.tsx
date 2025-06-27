import { useEffect, useState } from "react";
import { apiRequest } from "../lib/queryClient";

interface Vendor {
  id: string;
  businessName: string;
  businessPhone: string;
  approvalStatus: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  approvalStatus: string;
}

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState("vendors");

const fetchVendors = async () => {
  try {
    const res = await apiRequest("GET", "/api/admin/vendors");

    // ✅ सही जगह से array access करें
    if (Array.isArray(res.data.data)) {
      setVendors(res.data.data); // ✅ अब ये सही चलेगा
    } else {
      setVendors([]);
    }
  } catch (error) {
    console.error("Error fetching vendors:", error);
    setVendors([]);
  }
};

  const fetchProducts = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/products");
      if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const approveVendor = async (vendorId: string) => {
    try {
      await apiRequest("POST", `/api/sellers/approve`, { sellerId: vendorId });
      fetchVendors();
      alert("Vendor approved successfully!");
    } catch (error) {
      console.error("Error approving vendor:", error);
      alert("Failed to approve vendor.");
    }
  };

  const rejectVendor = async (vendorId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiRequest("POST", `/api/sellers/reject`, {
        sellerId: vendorId,
        rejectionReason: reason,
      });
      fetchVendors();
      alert("Vendor rejected successfully!");
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      alert("Failed to reject vendor.");
    }
  };

  const approveProduct = async (productId: number) => {
    try {
      await apiRequest("POST", `/api/admin/approve-product/${productId}`, {});
      fetchProducts();
      alert("Product approved successfully!");
    } catch (error) {
      console.error("Error approving product:", error);
      alert("Failed to approve product.");
    }
  };

  const rejectProduct = async (productId: number) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await apiRequest("POST", `/api/admin/reject-product/${productId}`, {
        rejectionReason: reason,
      });
      fetchProducts();
      alert("Product rejected successfully!");
    } catch (error) {
      console.error("Error rejecting product:", error);
      alert("Failed to reject product.");
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchProducts();
  }, []);

  return (
    <div className="p-4">
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2 rounded ${
            activeTab === "vendors" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded ${
            activeTab === "products" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Products
        </button>
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
                      {vendor.approvalStatus === "pending" ? (
                        <>
                          <button
                            onClick={() => approveVendor(vendor.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectVendor(vendor.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span
                          className={`font-semibold ${
                            vendor.approvalStatus === "approved"
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
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
                <th className="border px-4 py-2 text-left">Category ID</th>
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
                    <td className="border px-4 py-2">{product.categoryId}</td>
                    <td className="border px-4 py-2">{product.approvalStatus}</td>
                    <td className="border px-4 py-2 space-x-2">
                      <button
                        onClick={() => approveProduct(product.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectProduct(product.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Reject
                      </button>
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
    </div>
  );
}
