// client/src/components/SellerRegistrationForm.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth"; // Assuming useAuth provides the user object
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react"; // For loading spinner
import { Link, useLocation } from "wouter"; // For redirection

// 1. Define your form schema using Zod
const sellerRegistrationSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  address: z.string().min(10, "Address must be at least 10 characters.").max(200),
  city: z.string().min(2, "City must be at least 2 characters.").max(50),
  state: z.string().min(2, "State must be at least 2 characters.").max(50),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  bankName: z.string().min(3, "Bank name is required.").max(100),
  accountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be 9-18 digits."),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code."),
});

type SellerRegistrationFormData = z.infer<typeof sellerRegistrationSchema>;

export default function SellerRegistrationForm() {
  const { user, loading } = useAuth(); // Get user from useAuth
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation(); // For Wouter redirection

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SellerRegistrationFormData>({
    resolver: zodResolver(sellerRegistrationSchema),
  });

  // 2. Define the mutation for seller registration
  const registerSellerMutation = useMutation({
    mutationFn: async (data: SellerRegistrationFormData) => {
      if (!user || !user.uid) {
        throw new Error("User not authenticated.");
      }

      const idToken = await user.getIdToken(); // Get ID token from Firebase user

      const response = await fetch("/api/sellers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
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
      // Invalidate queries to refetch seller status if needed
      queryClient.invalidateQueries({ queryKey: ['user'] }); 
      queryClient.invalidateQueries({ queryKey: ['sellerData'] }); 
      
      // Clear the loginRole flag from sessionStorage as registration is done
      sessionStorage.removeItem("loginRole"); 

      // Redirect user to a 'pending approval' page or directly to seller dashboard
      // Based on your previous logic, they would be re-evaluated by AuthRedirectGuard
      // which will then send them to seller-dashboard (if approved) or keep them here
      // if you still want them to see a pending message.
      // For now, let's redirect to a common status page or home for re-evaluation.
      setLocation("/seller-status"); // You might want to create a page like /seller-status
                                     // or simply redirect to home for AuthRedirectGuard to handle
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user data...</span>
      </div>
    );
  }

  // If user is not logged in, or if it's a general user, handle it
  // This scenario should ideally be handled by AuthRedirectGuard earlier,
  // but keeping a fallback for robustness.
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-gray-600 mb-6">
          Please log in to continue with seller registration.
        </p>
        {/* You can add a login button here if desired */}
        <Button onClick={() => setLocation("/")}>Go to Home & Login</Button>
      </div>
    );
  }

  // If user is already an approved seller, redirect them
  if (user.role === "approved-seller") {
    setLocation("/seller-dashboard"); // Redirect if already approved
    return null; // Don't render form if already redirected
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 my-10 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-neutral-900 mb-6">
        Become a Seller on Shopnish
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Join our platform and start selling your products today!
      </p>

      {/* Seller Benefits Section */}
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
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              {...register("storeName")}
              className={errors.storeName ? "border-red-500" : ""}
            />
            {errors.storeName && (
              <p className="text-red-500 text-sm mt-1">{errors.storeName.message}</p>
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
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              {...register("address")}
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
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
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              {...register("state")}
              className={errors.state ? "border-red-500" : ""}
            />
            {errors.state && (
              <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
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
        </div>

        {/* Bank Information */}
        <h3 className="text-xl font-semibold mt-8 mb-4">Bank Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              {...register("bankName")}
              className={errors.bankName ? "border-red-500" : ""}
            />
            {errors.bankName && (
              <p className="text-red-500 text-sm mt-1">{errors.bankName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              {...register("accountNumber")}
              className={errors.accountNumber ? "border-red-500" : ""}
            />
            {errors.accountNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.accountNumber.message}</p>
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
