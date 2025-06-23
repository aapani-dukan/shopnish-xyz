// client/src/components/SellerRegistrationForm.tsx

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth"; // ✅ useAuth को इम्पोर्ट करें
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";

// 1. Define your form schema using Zod
// ध्यान दें: ये फ़ील्ड्स आपके sellers स्कीमा से मेल खाने चाहिए जो backend/schema में है।
// मैंने उन्हें आपके sellers/apply.ts राउट के हिसाब से एडजस्ट किया है।
const sellerRegistrationSchema = z.object({
  businessName: z.string().min(3, "Business name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  businessAddress: z.string().min(10, "Business address must be at least 10 characters.").max(200),
  city: z.string().min(2, "City must be at least 2 characters.").max(50),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  businessPhone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits."), // उदाहरण के लिए 10-अंकीय फोन नंबर
  gstNumber: z.string().max(15).optional(), // optional, if not strictly required
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be 9-18 digits."),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code."),
  deliveryRadius: z.number().min(1).max(100).default(5), // Make sure this matches your schema
  businessType: z.string().min(2).max(50).default('grocery'), // Make sure this matches your schema
});

type SellerRegistrationFormData = z.infer<typeof sellerRegistrationSchema>;

export function SellerRegistrationForm() {
  // ✅ firebaseUser का उपयोग करें Firebase ID टोकन के लिए
  const { user, firebaseUser, isLoadingAuth, isAuthenticated } = useAuth(); 
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SellerRegistrationFormData>({
    resolver: zodResolver(sellerRegistrationSchema),
    // यदि आप डिफ़ॉल्ट मान सेट करना चाहते हैं तो यहाँ करें
    defaultValues: {
      businessName: "",
      description: "",
      businessAddress: "",
      city: "",
      pincode: "",
      businessPhone: "",
      gstNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
      deliveryRadius: 5,
      businessType: "grocery",
    },
  });

  const registerSellerMutation = useMutation({
    mutationFn: async (data: SellerRegistrationFormData) => {
      // ✅ firebaseUser की जाँच करें, user.uid की नहीं
      if (!firebaseUser) { 
        throw new Error("User not authenticated.");
      }

      // ✅ firebaseUser से ID टोकन प्राप्त करें
      const idToken = await firebaseUser.getIdToken(); 

      // ✅ आपके /api/sellers/apply राउट को अब body में userId की आवश्यकता नहीं है
      // क्योंकि वह req.user.uid से Firebase UID को उठाता है।
      const response = await fetch("/api/sellers/apply", { // ✅ सुनिश्चित करें कि यह सही एंडपॉइंट है
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data), // ✅ सीधे फॉर्म डेटा भेजें
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register as a seller.");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration Successful!",
        description: "Your seller application has been submitted and is pending approval.",
      });
      // ✅ invalidateQueries को और अधिक सटीक बनाएं
      queryClient.invalidateQueries({ queryKey: ['/api/sellers/me'] }); // मौजूदा विक्रेता प्रोफ़ाइल को री-फेच करने के लिए
      queryClient.invalidateQueries({ queryKey: ['user'] }); // यदि user's role अपडेट हो गया है
      
      sessionStorage.removeItem("loginRole"); // यह ठीक है

      setLocation("/seller-status"); // यह ठीक है
      reset(); // फॉर्म को रीसेट करें
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SellerRegistrationFormData) => {
    registerSellerMutation.mutate(data);
  };

  // ✅ isLoadingAuth का उपयोग करें
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentication status...</span>
      </div>
    );
  }

  // ✅ isAuthenticated का उपयोग करें
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-gray-600 mb-6">
          Please log in to continue with seller registration.
        </p>
        <Link href="/">
          <Button>Go to Home & Login</Button>
        </Link>
      </div>
    );
  }

  // ✅ user.role को चेक करें
  // 'approved-seller' की जगह 'seller' या 'pending_seller' का उपयोग करें
  // अगर रोल 'seller' है तो डैशबोर्ड पर भेजें
  if (user?.role === "seller") { // ✅ 'user?.role' और 'seller' रोल
    setLocation("/seller-dashboard");
    return null;
  }
  
  // यदि यूजर पहले से ही pending_seller है तो उसे सूचित करें
  if (user?.role === "pending_seller") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Application Already Submitted</h2>
        <p className="text-gray-600 mb-6">
          Your seller application is already submitted and is currently pending approval.
          Please wait for an update.
        </p>
        <Link href="/seller-status">
          <Button>Check Application Status</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 my-10 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-neutral-900 mb-6">
        Become a Seller on Shopnish
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Join our platform and start selling your products today!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center text-primary">
        <div className="p-4 bg-primary-50 rounded-lg">
          <h3 className="font-semibold text-lg">🚀 Quick Onboarding</h3>
          <p className="text-sm text-gray-700">Get started in minutes!</p>
        </div>
        <div className="p-4 bg-primary-50 rounded-lg">
          <h3 className="font-semibold text-lg">💡 Reach More Customers</h3>
          <p className="text-sm text-gray-700">Expand your business online.</p>
        </div>
        <div className="p-4 bg-primary-50 rounded-lg">
          <h3 className="font-semibold text-lg">📈 Grow Your Business</h3>
          <p className="text-sm text-gray-700">Powerful tools at your fingertips.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Store Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="businessName">Store Name</Label>
            <Input
              id="businessName"
              {...register("businessName")}
              className={errors.businessName ? "border-red-500" : ""}
            />
            {errors.businessName && (
              <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Store Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* Address Information */}
        <h3 className="text-xl font-semibold mt-8 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="businessAddress">Full Address</Label>
            <Input
              id="businessAddress"
              {...register("businessAddress")}
              className={errors.businessAddress ? "border-red-500" : ""}
            />
            {errors.businessAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.businessAddress.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
                {...register("city")}
              className={errors.city ? "border-red-500" : ""}
            />
            {errors.city && (
              <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              {...register("pincode")}
              className={errors.pincode ? "border-red-500" : ""}
            />
            {errors.pincode && (
              <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
            )}
          </div>
          {/* Add State field if needed as per your schema */}
          {/* <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              {...register("state")}
              className={errors.state ? "border-red-500" : ""}
            />
            {errors.state && (
              <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
            )}
          </div> */}
           <div>
            <Label htmlFor="businessType">Business Type</Label>
            <Input
              id="businessType"
              {...register("businessType")}
              className={errors.businessType ? "border-red-500" : ""}
            />
            {errors.businessType && (
              <p className="text-red-500 text-sm mt-1">{errors.businessType.message}</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <h3 className="text-xl font-semibold mt-8 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="businessPhone">Business Phone</Label>
            <Input
              id="businessPhone"
              {...register("businessPhone")}
              className={errors.businessPhone ? "border-red-500" : ""}
            />
            {errors.businessPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.businessPhone.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="gstNumber">GST Number (Optional)</Label>
            <Input
              id="gstNumber"
              {...register("gstNumber")}
              className={errors.gstNumber ? "border-red-500" : ""}
            />
            {errors.gstNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.gstNumber.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="deliveryRadius">Delivery Radius (in km)</Label>
            <Input
              id="deliveryRadius"
              type="number"
              {...register("deliveryRadius", { valueAsNumber: true })} // ✅ valueAsNumber का उपयोग करें
              className={errors.deliveryRadius ? "border-red-500" : ""}
            />
            {errors.deliveryRadius && (
              <p className="text-red-500 text-sm mt-1">{errors.deliveryRadius.message}</p>
            )}
          </div>
        </div>

        {/* Bank Information */}
        <h3 className="text-xl font-semibold mt-8 mb-4">Bank Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bankAccountNumber">Account Number</Label>
            <Input
              id="bankAccountNumber"
              {...register("bankAccountNumber")}
              className={errors.bankAccountNumber ? "border-red-500" : ""}
            />
            {errors.bankAccountNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.bankAccountNumber.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              {...register("ifscCode")}
              className={errors.ifscCode ? "border-red-500" : ""}
            />
            {errors.ifscCode && (
              <p className="text-red-500 text-sm mt-1">{errors.ifscCode.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={registerSellerMutation.isPending}>
          {registerSellerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            "Register as Seller"
          )}
        </Button>
      </form>
    </div>
  );
}
