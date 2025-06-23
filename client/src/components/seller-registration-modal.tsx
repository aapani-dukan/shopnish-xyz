// client/src/components/seller-registration-modal.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema"; // आपका schema पाथ
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Check, X, Store } from "lucide-react";

// आपकी मौजूदा sellerFormSchema
const sellerFormSchema = insertSellerSchema.omit({ userId: true });

type FormData = z.infer<typeof sellerFormSchema>;

interface SellerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerRegistrationModal({ isOpen, onClose }: SellerRegistrationModalProps) {
  const { user, isAuthenticated } = useAuth(); // isAuthenticated अभी भी यहां ठीक है
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
    },
  });

  const registerSellerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // ✅ यह चेक अभी भी यहीं रहेगा ताकि सबमिशन केवल लॉग-इन यूजर से हो।
      if (!user?.uid || !isAuthenticated) {
        throw new Error("User is not authenticated. Please log in first to submit the form.");
      }
      const payload = { ...data, userId: user.uid };
      const response = await apiRequest("POST", "/api/sellers", payload);
      return response;
    },
    onSuccess: () => {
      setShowSuccess(true);
      reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        // setLocation("/admin-dashboard"); // यदि आप सफलता के बाद रीडायरेक्ट करना चाहते हैं
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
      // आप यहां onClose() भी कॉल कर सकते हैं यदि आप एरर पर भी मॉडल बंद करना चाहते हैं।
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submitted!");
    console.log("Form data:", data);
    registerSellerMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
    setShowSuccess(false);
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

  // ✅ यह लॉगिन प्रॉम्प्ट ब्लॉक अब हटा दिया गया है।
  // यदि आप पूरी तरह से सुनिश्चित हैं कि यह मॉडल तभी खुलेगा जब यूजर लॉग इन होगा,
  // तो यह ठीक है। अन्यथा, आपको यह सुनिश्चित करना होगा कि यूजर को लॉग इन करने का
  // कोई और तरीका प्रदान किया जाए, या इस मॉडल को तभी खोला जाए जब user object मौजूद हो।

  // यदि मॉडल बंद है तो कुछ भी रेंडर न करें
  if (!isOpen) {
    return null;
  }

  // ✅ मुख्य फॉर्म रेंडर करें (हमेशा जब isOpen true हो और success न हो)
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
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </Label>
            <Input
              id="businessName"
              {...register("businessName")}
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
              {...register("businessAddress")}
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
              {...register("deliveryRadius", { valueAsNumber: true })}
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
              disabled={registerSellerMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {registerSellerMutation.isPending ? (
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
