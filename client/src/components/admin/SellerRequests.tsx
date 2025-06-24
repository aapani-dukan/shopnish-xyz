// client/src/components/admin/SellerRequests.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // ✅ React Query hooks इम्पोर्ट करें
import { useToast } from "@/hooks/use-toast"; // ✅ Toast इम्पोर्ट करें

// ✅ Seller टाइप को अपडेट करें: id अब string के बजाय number होगी
type Seller = {
  id: number; // ✅ ID अब number है
  businessName: string;
  approvalStatus: string;
  rejectionReason: string | null;
  approvedAt: string | null;
};

const SellerRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ React Query का उपयोग करके सेलर्स को Fetch करें
  const { data: sellers, isLoading: loading, error } = useQuery<Seller[], Error>({
    queryKey: ["adminPendingSellers"],
    queryFn: async () => {
      const res = await axios.get("/api/sellers/pending");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 मिनट के लिए डेटा को stale न होने दें
    cacheTime: 10 * 60 * 1000, // 10 मिनट के बाद कैश साफ़ करें
  });

  // ✅ Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (sellerId: number) => { // ✅ sellerId को number टाइप दें
      await axios.post("/api/sellers/approve", { sellerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingSellers"] }); // डेटा को री-फ़ेच करने के लिए
      toast({
        title: "Seller Approved",
        description: "Seller has been successfully approved.",
        variant: "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Approval Failed",
        description: err.response?.data?.message || "Failed to approve seller.",
        variant: "destructive",
      });
    },
  });

  // ✅ Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ sellerId, reason }: { sellerId: number; reason: string }) => { // ✅ sellerId को number टाइप दें
      await axios.post("/api/sellers/reject", { sellerId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingSellers"] }); // डेटा को री-फ़ेच करने के लिए
      toast({
        title: "Seller Rejected",
        description: "Seller has been successfully rejected.",
        variant: "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Rejection Failed",
        description: err.response?.data?.message || "Failed to reject seller.",
        variant: "destructive",
      });
    },
  });


  const handleApprove = (sellerId: number) => { // ✅ sellerId को number टाइप दें
    approveMutation.mutate(sellerId);
  };

  const handleReject = (sellerId: number) => { // ✅ sellerId को number टाइप दें
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

  if (loading) return <p>Loading seller requests...</p>;
  if (error) return <p>Error loading seller requests: {error.message}</p>; // ✅ Error handling

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pending Seller Requests</h2>
      {sellers && sellers.length === 0 ? ( // ✅ `sellers` की उपलब्धता जांचें
        <p>No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {sellers?.map((seller) => ( // ✅ `sellers` की उपलब्धता जांचें
            <li key={seller.id} className="border p-4 rounded shadow-sm">
              <p><strong>Business:</strong> {seller.businessName}</p>
              <div className="mt-2 space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded disabled:bg-gray-400" // ✅ Disabled state
                  onClick={() => handleApprove(seller.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending} // ✅ बटन को डिसेबल करें
                >
                  {approveMutation.isPending && approveMutation.variables === seller.id ? "Approving..." : "Approve"}
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded disabled:bg-gray-400" // ✅ Disabled state
                  onClick={() => handleReject(seller.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending} // ✅ बटन को डिसेबल करें
                >
                  {rejectMutation.isPending && rejectMutation.variables?.sellerId === seller.id ? "Rejecting..." : "Reject"}
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
