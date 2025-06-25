import { useEffect, useState } from "react";
// apiRequest फंक्शन को इंपोर्ट करना सुनिश्चित करें।
// यह आमतौर पर client/src/utils/api.ts या इसी तरह की फाइल में डिफाइन होता है।
// उदाहरण के लिए: import { apiRequest } from '../utils/api';
import { apiRequest } from '../lib/queryClient';

// Vendor इंटरफ़ेस को आपके डेटाबेस स्कीमा के अनुसार अपडेट किया गया
interface Vendor {
  id: string; // Drizzle/PostgreSQL आमतौर पर ID के लिए 'id' का उपयोग करता है
  businessName: string;
  businessPhone: string; // आपके बैकएंड स्कीमा के 'businessPhone' से मैच करने के लिए
  approvalStatus: string; // आपके बैकएंड स्कीमा के 'approvalStatus' से मैच करने के लिए
  // अगर आप Admin Dashboard पर और भी जानकारी दिखाना चाहते हैं तो यहां जोड़ें
  // e.g., description?: string; city?: string; pincode?: string;
}

// Product इंटरफ़ेस को आपके डेटाबेस स्कीमा के अनुसार अपडेट किया गया
interface Product {
  id: string; // Drizzle/PostgreSQL आमतौर पर ID के लिए 'id' का उपयोग करता है
  name: string;
  price: number;
  category: string;
  status: string; // Product स्टेटस के लिए 'status' सही हो सकता है
}


export default function AdminDashboard() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState("vendors");

  const fetchVendors = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/vendors");
      // ✅ यहाँ सुरक्षित रूप से डेटा हैंडल करें
      if (res && Array.isArray(res.data)) {
        setVendors(res.data);
        console.log("Fetched vendors for admin:", res.data);
      } else {
        // अगर res.data एरे नहीं है, तो एक खाली एरे सेट करें या लॉग करें
        setVendors([]); // या मौजूदा डेटा को बनाए रखें
        console.warn("API response for vendors is not an array:", res.data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendors([]); // एरर होने पर भी लिस्ट को खाली करें ताकि UI क्रैश न हो
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/products");
      // ✅ यहाँ भी सुरक्षित रूप से डेटा हैंडल करें
      if (res && Array.isArray(res.data)) {
        setProducts(res.data);
        console.log("Fetched products for admin:", res.data);
      } else {
        setProducts([]);
        console.warn("API response for products is not an array:", res.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };


  const approveVendor = async (vendorId: string) => {
    try {
      await apiRequest("POST", `/api/admin/approve-vendor/${vendorId}`, {});
      fetchVendors(); // वेंडर्स की लिस्ट को रिफ्रेश करें
      alert("Vendor approved successfully!");
    } catch (error) {
      console.error("Error approving vendor:", error);
      alert("Failed to approve vendor.");
    }
  };

  const rejectVendor = async (vendorId: string) => {
    try {
      await apiRequest("POST", `/api/admin/reject-vendor/${vendorId}`, {});
      fetchVendors(); // वेंडर्स की लिस्ट को रिफ्रेश करें
      alert("Vendor rejected successfully!");
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      alert("Failed to reject vendor.");
    }
  };

  const approveProduct = async (productId: string) => {
    try {
      await apiRequest("POST", `/api/admin/approve-product/${productId}`, {});
      fetchProducts();
      alert("Product approved successfully!");
    } catch (error) {
      console.error("Error approving product:", error);
      alert("Failed to approve product.");
    }
  };

  const rejectProduct = async (productId: string) => {
    try {
      await apiRequest("POST", `/api/admin/reject-product/${productId}`, {});
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
          className={`px-4 py-2 rounded ${activeTab === "vendors" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded ${activeTab === "products" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
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
                  <tr key={vendor.id} className="hover:bg-gray-50"> {/* '_id' की जगह 'id' */}
                    <td className="border px-4 py-2">{vendor.businessName}</td>
                    <td className="border px-4 py-2">{vendor.businessPhone}</td> {/* 'phoneNumber' की जगह 'businessPhone' */}
                    <td className="border px-4 py-2">{vendor.approvalStatus}</td> {/* 'status' की जगह 'approvalStatus' */}
                    <td className="border px-4 py-2 space-x-2">
                      {vendor.approvalStatus === 'pending' ? (
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
                  <tr key={product.id} className="hover:bg-gray-50"> {/* '_id' की जगह 'id' */}
                    <td className="border px-4 py-2">{product.name}</td>
                    <td className="border px-4 py-2">{product.price}</td>
                    <td className="border px-4 py-2">{product.category}</td>
                    <td className="border px-4 py-2">{product.status}</td>
                    <td className="border px-4 py-2 space-x-2">
                      {/* यहां प्रोडक्ट स्टेटस के आधार पर बटन लॉजिक जोड़ सकते हैं */}
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
