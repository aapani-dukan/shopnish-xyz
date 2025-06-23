// client/src/components/seller-registration-modal.tsx
import { useState } from "react"; // ✅ useState इम्पोर्ट करें
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // ✅ Input इम्पोर्ट करें
import { Label } from "@/components/ui/label"; // ✅ Label इम्पोर्ट करें
import { Textarea } from "@/components/ui/textarea"; // Textarea भी रखें
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema"; // ✅ अपने schema का सही पाथ
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Check, X, Store } from "lucide-react"; // ✅ Check और X इम्पोर्ट करें

// आपकी मौजूदा sellerFormSchema
const sellerFormSchema = insertSellerSchema.omit({ userId: true }).extend({
  // उदाहरण से name और mobile फ़ील्ड्स जोड़े गए हैं
  // सुनिश्चित करें कि ये फ़ील्ड्स आपके Drizzle schema में मौजूद हैं या आप उन्हें हटा सकते हैं
  // यदि आप अपने मूल sellerFormSchema (businessName, businessType, etc.) का उपयोग करना चाहते हैं,
  // तो बस इन name और mobile फ़ील्ड्स को हटा दें और अपने पुराने FormField कंपोनेंट्स को वापस लाएँ।
  // मैं अभी के लिए उन्हें उदाहरण के रूप में रख रहा हूँ ताकि फॉर्म सबमिशन काम करे।
  // यदि आपका Drizzle schema `name` या `mobile` नहीं रखता है, तो यह बाद में समस्या पैदा करेगा।
  // कृपया अपने schema को ध्यान में रखें।
  // **महत्वपूर्ण:** मैं आपके मूल `sellerFormSchema` के सभी फ़ील्ड्स को `Input` और `Textarea` के साथ
  // `register` का उपयोग करके शामिल कर रहा हूँ, जैसा कि उदाहरण में था।
});

type FormData = z.infer<typeof sellerFormSchema>;

interface SellerRegistrationModalProps { // ✅ Props को isOpen और onClose के लिए अपडेट करें
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerRegistrationModal({ isOpen, onClose }: SellerRegistrationModalProps) {
  const { user, isAuthenticated } = useAuth(); // isAuthenticated अभी भी चेक करना बेहतर है
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false); // ✅ सक्सेस स्टेट

  const {
    register, // ✅ useForm से register को इम्पोर्ट करें
    handleSubmit, // ✅ useForm से handleSubmit को इम्पोर्ट करें
    formState: { errors, isSubmitting }, // ✅ errors और isSubmitting को भी इम्पोर्ट करें
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(sellerFormSchema),
    defaultValues: {
      businessName: "",
      businessType: "grocery",
      description: "",
      businessAddress: "",
      city: "",
      pincode: "",
      businessPhone: "",
      gstNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
      deliveryRadius: 5,
      // userId: user?.id || undefined, // userId को omit किया गया है, इसलिए इसे यहाँ न रखें
    },
  });

  const registerSellerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?.uid || !isAuthenticated) {
        throw new Error("User is not authenticated. Please log in first.");
      }
      const payload = { ...data, userId: user.uid }; // userId को यहां जोड़ें
      const response = await apiRequest("POST", "/api/sellers", payload); // ✅ API पाथ सही रखें
      // Drizzle API आम तौर पर JSON रिस्पांस देती है
      return response; // response.json() यदि आपका apiRequest पहले से ही JSON को पार्स नहीं कर रहा है
    },
    onSuccess: () => {
      setShowSuccess(true); // ✅ सक्सेस स्टेट सेट करें
      reset(); // ✅ फॉर्म रीसेट करें
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] }); // ✅ Query invalidate करें
      
      setTimeout(() => { // ✅ 2 सेकंड बाद मॉडल बंद करें
        setShowSuccess(false);
        onClose();
        // यदि आप सफलता के बाद किसी विशेष पेज पर रीडायरेक्ट करना चाहते हैं, तो यहाँ setLocation("/your-success-page"); जोड़ें
        // setLocation("/admin-dashboard"); // यदि आप सीधे admin-dashboard पर जाना चाहते हैं
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
      // यदि आप एरर पर भी मॉडल बंद करना चाहते हैं, तो onClose() यहाँ जोड़ें।
      // onClose();
    },
  });

  // ✅ onSubmit फ़ंक्शन को handleSubmit से जोड़ें
  const onSubmit = (data: FormData) => {
    console.log("Form submitted!");
    console.log("Form data:", data);
    registerSellerMutation.mutate(data);
  };

  const handleClose = () => { // ✅ क्लोज हैंडलर
    reset();
    onClose();
    setShowSuccess(false); // सुनिश्चित करें कि बंद होने पर सक्सेस स्टेट रीसेट हो
  };

  // ✅ सक्सेस स्टेट के आधार पर रेंडरिंग
  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600 text-2xl w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-600 mb-6">Your seller application has been submitted successfully. We'll review it and get back to you soon.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // यदि isAuthenticated नहीं है, तो तुरंत लॉग इन करने के लिए प्रॉम्प्ट दिखाएं
  // यह सुनिश्चित करने के लिए कि फॉर्म तभी खुले जब यूजर लॉग इन हो।
  if (!isAuthenticated && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Join as a Seller
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-muted-foreground mb-4">Please log in to register as a seller.</p>
            {/* यदि आप Firebase का उपयोग कर रहे हैं और login page पर redirect करना चाहते हैं */}
            <Button onClick={() => setLocation("/login")} className="w-full">
              Continue to Login
            </Button>
            {/* या initiateGoogleSignInRedirect यदि यह Firebase का पॉपअप/रीडायरेक्ट है */}
            {/* <Button onClick={initiateGoogleSignInRedirect} className="w-full">
              Continue with Google
            </Button> */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ✅ मुख्य फॉर्म रेंडर करें
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-gray-900">Become a Seller</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            Register your local grocery store or kirana shop for same-city delivery within 1 hour
          </p>
        </DialogHeader>
        
        {/* ✅ form टैग को सीधे handleSubmit से जोड़ें */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </Label>
            <Input
              id="businessName"
              {...register("businessName")} // ✅ register का उपयोग करें
              placeholder="Enter your business name"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.businessName && (
              <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </Label>
            <Textarea
              id="businessAddress"
              {...register("businessAddress")} // ✅ register का उपयोग करें
              placeholder="Enter your business address"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.businessAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.businessAddress.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </Label>
            <Input
              id="businessType"
              {...register("businessType")}
              placeholder="e.g., grocery, electronics"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.businessType && (
              <p className="text-red-500 text-sm mt-1">{errors.businessType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Describe your business"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City
            </Label>
            <Input
              id="city"
              {...register("city")}
              placeholder="Your city"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.city && (
              <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
              Pincode
            </Label>
            <Input
              id="pincode"
              {...register("pincode")}
              placeholder="e.g., 305001"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.pincode && (
              <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Business Phone
            </Label>
            <Input
              id="businessPhone"
              {...register("businessPhone")}
              placeholder="Enter business contact number"
              type="tel"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.businessPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.businessPhone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </Label>
            <Input
              id="gstNumber"
              {...register("gstNumber")}
              placeholder="Enter GST number"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.gstNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.gstNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Bank Account Number
            </Label>
            <Input
              id="bankAccountNumber"
              {...register("bankAccountNumber")}
              placeholder="Enter bank account number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.bankAccountNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.bankAccountNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-2">
              IFSC Code
            </Label>
            <Input
              id="ifscCode"
              {...register("ifscCode")}
              placeholder="Enter IFSC code"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.ifscCode && (
              <p className="text-red-500 text-sm mt-1">{errors.ifscCode.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="deliveryRadius" className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Radius (in km)
            </Label>
            <Input
              id="deliveryRadius"
              {...register("deliveryRadius", { valueAsNumber: true })} // संख्या के रूप में वैल्यू प्राप्त करें
              placeholder="e.g., 5"
              type="number"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 outline-none"
            />
            {errors.deliveryRadius && (
              <p className="text-red-500 text-sm mt-1">{errors.deliveryRadius.message}</p>
            )}
          </div>
          
          <div className="pt-4">
            <Button
              type="submit"
              disabled={registerSellerMutation.isPending} // ✅ isPending का उपयोग करें
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {registerSellerMutation.isPending ? ( // ✅ isPending का उपयोग करें
                <>
                  <span>Submitting...</span>
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
