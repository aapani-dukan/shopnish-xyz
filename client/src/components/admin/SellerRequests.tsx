import React, { useEffect, useState } from "react";
import axios from "axios";

type Seller = {
  id: string;
  businessName: string;
  approvalStatus: string;
  rejectionReason: string | null;
  approvedAt: string | null;
};

const SellerRequests = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSellers = async () => {
    try {
      const res = await axios.get("/api/sellers/pending");
      setSellers(res.data);
    } catch (error) {
      console.error("Failed to fetch sellers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sellerId: string) => {
    await axios.post("/api/sellers/approve", { sellerId });
    fetchSellers();
  };

  const handleReject = async (sellerId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    await axios.post("/api/sellers/reject", { sellerId, reason });
    fetchSellers();
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  if (loading) return <p>Loading seller requests...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Seller Requests</h2>
      {sellers.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {sellers.map((seller) => (
            <li key={seller.id} className="border p-4 rounded shadow-sm">
              <p><strong>Business:</strong> {seller.businessName}</p>
              <div className="mt-2 space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => handleApprove(seller.id)}
                >
                  Approve
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleReject(seller.id)}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SellerRequests;
