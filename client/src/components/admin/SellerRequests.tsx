// client/src/components/admin/SellerRequests.tsx
import React from "react"; // useEffect and useState are not strictly needed here
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast"; // assuming useToast is correctly mapped in tsconfig

// Seller टाइप को अपडेट करें
// यदि Seller टाइप shared/backend/schema से आ रहा है, तो उसे वहां से इम्पोर्ट करना बेहतर है।
// लेकिन इस उदाहरण के लिए, हम इसे यहीं परिभाषित कर रहे हैं।
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

  // React Query का उपयोग करके सेलर्स को Fetch करें
  // 'staleTime' और 'cacheTime' दोनों को एक साथ इस्तेमाल किया जा सकता है।
  // 'staleTime' बताता है कि डेटा कब 'stale' हो जाता है (यानी, बैकग्राउंड में फिर से फ़ेच किया जाना चाहिए)।
  // 'cacheTime' बताता है कि डेटा को कैश से कब हटा दिया जाना चाहिए यदि इसका उपयोग नहीं किया जा रहा है।
  const { data: sellers, isLoading: loading, error } = useQuery<Seller[], Error>({
    queryKey: ["adminPendingSellers"],
    queryFn: async () => {
      const res = await axios.get("/api/sellers/pending");
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes (This was causing the 'cacheTime' error in previous logs if you had an older react-query version, but should be fine with @tanstack/react-query v4/v5)
  });

  // Approve Mutation
  const approveMutation = useMutation<void, Error, number>({ // <SuccessData, ErrorType, VariablesType>
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
    onError: (err) => { // 'err' को 'any' के बजाय 'Error' टाइप करें
      toast({
        title: "Approval Failed",
        description: axios.isAxiosError(err) ? err.response?.data?.message || "Failed to approve seller." : err.message,
        variant: "destructive",
      });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation<void, Error, { sellerId: number; reason: string }>({ // <SuccessData, ErrorType, VariablesType>
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
    onError: (err) => { // 'err' को 'any' के बजाय 'Error' टाइप करें
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

  // लोडिंग और एरर हैंडलिंग
  if (loading) {
    return <p className="p-4 text-center">Loading seller requests...</p>;
  }

  if (error) {
    return <p className="p-4 text-red-500 text-center">Error loading seller requests: {error.message}</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Pending Seller Requests</h2>
      {/* डेटा की जांच करें कि यह एक एरे है और खाली है */}
      {sellers && sellers.length === 0 ? (
        <p className="text-gray-600">No pending seller requests.</p>
      ) : (
        <ul className="space-y-4">
          {/* वैकल्पिक चेनिंग (?) का उपयोग करें, भले ही हमने पहले ही 'sellers' की जांच कर ली हो */}
          {sellers?.map((seller) => (
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
                  // यदि कोई म्यूटेशन लंबित है, तो दोनों बटन को डिसेबल करें
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {/* विशिष्ट विक्रेता के लिए लोडिंग स्थिति दिखाएं */}
                  {approveMutation.isPending && approveMutation.variables === seller.id
                    ? "Approving..."
                    : "Approve"}
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => handleReject(seller.id)}
                  // यदि कोई म्यूटेशन लंबित है, तो दोनों बटन को डिसेबल करें
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {/* विशिष्ट विक्रेता के लिए लोडिंग स्थिति दिखाएं (rejectMutation.variables एक ऑब्जेक्ट है) */}
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
