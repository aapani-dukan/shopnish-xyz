// client/src/components/admin/SellerRequests.tsx
import React from "react";
import axios from "axios"; // ✅ axios इम्पोर्ट करें
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast.js";
import { json } from "express";

type Seller = {
  id: number;
  businessName: string;
  approvalStatus: string;
  rejectionReason: string | null;
  approvedAt: string | null;
};

const SellerRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sellers, isLoading: loading, error } = useQuery<Seller[], Error>({
    queryKey: ["adminPendingSellers"],
    queryFn: async () => {
      const res = await axios.get("/api/sellers/pending");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // cacheTime को हटा दिया गया है क्योंकि यह useQueryOptions में सीधे नहीं होता है
    // इसकी जगह garbage collection timeout (gcTime) होता है, जो staleTime से लंबा होना चाहिए
    gcTime: 10 * 60 * 1000, // 10 minutes (कैश से हटाने का समय)
  });

  const approveMutation = useMutation<void, Error, number>({
    mutationFn: async (sellerId: number) => {
      await axios.post("/api/sellers/approve", { sellerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingSellers"] });
      toast({
        title: "Seller Approved",
        description: "Seller has been successfully approved.",
        variant: "default",
      });
    },
    onError: (err) => {
      toast({
        title: "Approval Failed",
        description: axios.isAxiosError(err) ? err.response?.data?.message || "Failed to approve seller." : err.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation<void, Error, { sellerId: number; reason: string }>({
    mutationFn: async ({ sellerId, reason }) => {
      await axios.post("/api/sellers/reject", { sellerId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingSellers"] });
      toast({
        title: "Seller Rejected",
        description: "Seller has been successfully rejected.",
        variant: "default",
      });
    },
    onError: (err) => {
      toast({
        title: "Rejection Failed",
        description: axios.isAxiosError(err) ? err.response?.data?.message || "Failed to reject seller." : err.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (sellerId: number) => {
    approveMutation.mutate(sellerId);
  };

  const handleReject = (sellerId: number) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason || reason.trim() === "") {
      toast({
        title: "Rejection Cancelled",
        description: "Rejection reason cannot be empty.",
        variant: "default",
      });
      return;
    }
    rejectMutation.mutate({ sellerId, reason });
  };

  if (loading) {
    return <p className="p-4 text-center">Loading seller requests...</p>;
  }

  if (error) {
    return <p className="p-4 text-red-500 text-center">Error loading seller requests: {error.message}</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Pending Seller Requests</h2>
      {/* Check if sellers is an array and is empty */}
      {sellers && sellers.length === 0 ? (
        <p className="text-gray-600">No pending seller requests.</p>
      ) : (
        <ul className="space-y-4">
          {/* Use optional chaining for sellers, even though we checked it above */}
          {sellers?.map((seller: Seller) => ( // ✅ `seller` को स्पष्ट रूप से टाइप करें
            <li key={seller.id} className="border border-gray-200 p-4 rounded-lg shadow-sm bg-white">
              <p className="text-lg font-medium text-gray-700">
                <strong>Business Name:</strong> {seller.businessName}
              </p>
              <p className="text-gray-500">
                <strong>Status:</strong> {seller.approvalStatus}
              </p>
              {seller.rejectionReason && (
                <p className="text-red-500 text-sm">
                  <strong>Reason:</strong> {seller.rejectionReason}
                </p>
              )}
              <div className="mt-4 flex space-x-2">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => handleApprove(seller.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending && approveMutation.variables === seller.id
                    ? "Approving..."
                    : "Approve"}
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => handleReject(seller.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {rejectMutation.isPending && rejectMutation.variables?.sellerId === seller.id
                    ? "Rejecting..."
                    : "Reject"}
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
