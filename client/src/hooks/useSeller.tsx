// client/src/hooks/useSeller.tsx
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import axios from "axios";

interface Seller {
  id: string;
  userId: string;
  businessName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  // Add other seller fields as per your schema
}

export function useSeller() {
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // useAuth से isAuthenticated और loading स्थिति प्राप्त करें
  
  const { data: seller, isLoading: sellerLoading } = useQuery<Seller | null>({ // null टाइप जोड़ें
    queryKey: ["/api/sellers/me"],
    queryFn: async () => {
      // Backend middleware को Firebase ID Token को हैंडल करना चाहिए
      const response = await axios.get("/api/sellers/me"); 
      if (response.status === 204) { // 204 No Content यदि कोई विक्रेता नहीं मिला
        return null;
      }
      if (!response.status.toString().startsWith("2")) { // 2xx स्टेटस कोड के अलावा कुछ और होने पर त्रुटि
        throw new Error("Failed to fetch seller data");
      }
      return response.data;
    },
    enabled: isAuthenticated, // केवल तभी सक्षम करें जब उपयोगकर्ता प्रमाणित हो
    retry: false, // 404 या प्रमाणीकरण समस्याओं पर फिर से प्रयास न करें
    staleTime: 5 * 60 * 1000, // 5 मिनट के लिए डेटा को ताजा मानें
    // यदि backend fetch विफल रहता है (जैसे 404 seller not found), तो `data` null होगा
    onError: (error) => {
      console.error("❌ useSeller: Error fetching seller data:", error);
      // यदि 404 है, तो यह अपेक्षित है यदि उपयोगकर्ता विक्रेता नहीं है, कोई onError कार्रवाई नहीं
    },
  });

  return {
    seller,
    isSeller: !!seller, // यदि विक्रेता डेटा मौजूद है तो true
    isLoading: authLoading || sellerLoading, // संयुक्त लोडिंग स्थिति
    isAuthenticated,
  };
}
