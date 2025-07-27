// client/src/components/seller/SellerOnboardingDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast"; // ✅ Corrected import for useToast
import { useNavigate } from "react-router-dom"; // ✅ Changed from wouter to react-router-dom
import { Check, X, Loader2, Clock } from "lucide-react";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form.js";

const sellerFormSchema = z.object({
  businessName: z.string().min(3, "Store name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(500),
  businessAddress: z.string().min(10, "Business address must be at least 10 characters.").max(200),
  city: z.string().min(2, "City must be at least 2 characters.").max(50),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  businessPhone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits."),
  gstNumber: z.string().max(15).optional(),
  bankAccountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be 9-18 digits."),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code."),
  deliveryRadius: z.preprocess( // ✅ Preprocess deliveryRadius to number
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(1, "Delivery radius must be a positive number").max(100, "Delivery radius cannot exceed 100km") // ✅ Number type for Zod
  ),
  businessType: z.string().min(2, "Business Type is required.").max(50),
});

type FormData = z.infer<typeof sellerFormSchema>;

// ✅ Assuming SellerProfile is the same as the Seller type from your @shared schema
// If not, you might need to create a dedicated type for the profile returned by /api/sellers/me
interface SellerProfile {
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  // Add other properties that are returned by /api/sellers/me if needed for rendering
  // e.g., id, userId, businessName, etc.
}

interface SellerOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerOnboardingDialog({ isOpen, onClose }: SellerOnboardingDialogProps) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // ✅ Changed from useLocation to useNavigate
//  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  // यदि डायलॉग खुलते ही isAuthenticated नहीं है, तो तुरंत लॉग इन पेज पर रीडायरेक्ट करें
  // useEffect is commented out as the Dialog logic handles it more gracefully now
  // with explicit authentication checks in the render logic.
  /*
  useEffect(() => {
    if (isOpen && !isLoadingAuth && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register as a seller.",
        variant: "destructive"
      });
      onClose(); // Close dialog
      navigate("/auth"); // Redirect to login page
    }
  }, [isOpen, isLoadingAuth, isAuthenticated, toast, onClose, navigate]);
  */


  const { data: existingSellerProfile, isLoading: isSellerProfileLoading } = useQuery<SellerProfile | null, Error>({
    queryKey: ["/api/sellers/me", user?.uid],
    queryFn: async ({ signal }) => {
      if (!user?.idToken) {
        return null; // Return null if token is not available, query will retry when enabled
      }
      try {
        const response = await apiRequest("GET", `/api/sellers/me`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
          signal,
        });
        if (response && typeof response === "object" && "data" in response) {
          return (response as { data: SellerProfile }).data;
        }
        throw new Error("Invalid response format from /api/sellers/me");
      } catch (error: any) {
        // ✅ Handle 404 specifically for "seller not found"
        if (error?.response?.status === 404) {
          console.log("Seller profile not found (404), proceeding with registration form.");
          return null; // Treat 404 as no existing profile
        }
        console.error("Error fetching seller profile:", error);
        throw error; // Re-throw other errors
      }
    },
    enabled: !isLoadingAuth && isAuthenticated && !!user?.idToken, // ✅ Enable query only when authenticated and token exists
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false, // Do not retry on 404, as 404 means no existing seller.
  });

  const form = useForm<FormData>({
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
      deliveryRadius: 5, // ✅ Default to number
    },
  });

  const registerSellerMutation = useMutation<any, Error, FormData>({
    mutationFn: async (data: FormData) => {
      if (!user?.idToken || !user?.uid) {
        throw new Error("User not authenticated or Firebase UID/Token missing at mutation time.");
      }
      const payload = {
        ...data,
        deliveryRadius: Number(data.deliveryRadius), // ✅ Ensure this is a number when sending
        firebaseUid: user.uid,
        email: user.email,
        name: user.name,
      };
      const response = await apiRequest("POST", "/api/sellers/apply", payload);
      return (response as { data: any }).data;
    },
    onSuccess: (data) => {
      onClose();
     // setShowSuccess(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast({
        title: "Application Submitted!",
        description: data.message || "Your seller application has been submitted successfully.",
      });

      // Navigate after a short delay for success message to be seen
      setTimeout(() => {
      //  setShowSuccess(false);
        onClose();
        navigate("/seller-status"); // ✅ Use navigate
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isLoadingAuth || !isAuthenticated || !user?.uid || !user?.idToken) {
        console.error("SellerOnboardingDialog: Attempted submit while auth loading or user data incomplete.");
        toast({
            title: "Authentication Pending",
            description: "Please wait, confirming your login status. Try again in a moment.",
            variant: "default"
        });
        return;
    }
    registerSellerMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
    setShowSuccess(false);
  };

  if (!isOpen) return null;

  // --- Render based on loading and authentication status ---

  // If authentication is still loading
  if (isLoadingAuth) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Verifying Login...</h2>
            <p className="text-gray-600">Please wait while we confirm your login status.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If authentication is complete but user is not logged in
  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              It seems you're not logged in or your session has expired. Please log in to your account to register as a seller.
            </p>
            <Button onClick={() => { handleClose(); navigate("/auth"); }}>Go to Login Page</Button> {/* ✅ Use navigate */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If seller profile is loading
  if (isSellerProfileLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Checking Registration Status...</h2>
            <p className="text-gray-600">Please wait while we check if you've already registered.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If an existing seller profile is found
  if (existingSellerProfile) {
    const statusText = existingSellerProfile.approvalStatus === "approved"
      ? "Approved"
      : existingSellerProfile.approvalStatus === "pending"
        ? "Pending Review"
        : "Rejected";
    const statusIcon = existingSellerProfile.approvalStatus === "approved"
      ? <Check className="text-green-600 h-8 w-8" />
      : existingSellerProfile.approvalStatus === "pending"
        ? <Clock className="text-yellow-600 h-8 w-8" />
        : <X className="text-red-600 h-8 w-8" />;

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {statusIcon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Registration Status: {statusText}</h2>
            <p className="text-gray-600 mb-6">
              You have already submitted your seller application.
              {existingSellerProfile.approvalStatus === "rejected" && (
                <span className="block mt-2">Reason: {existingSellerProfile.rejectionReason || 'No specific reason provided.'}</span>
              )}
            </p>
            <Button onClick={() => { handleClose(); navigate("/seller-status"); }}> {/* ✅ Use navigate */}
              View Full Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show success message (after successful form submission)
  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600 w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">Your seller application has been submitted successfully. We'll review it and get back to you soon.</p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main seller registration form
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
          <DialogDescription>
            Register your local grocery store or kirana shop for same-city delivery within 1 hour.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., grocery, electronics" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  <FormControl><Input {...field} type="text" inputMode="numeric" pattern="[0-9]*" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Phone</FormLabel>
                  <FormControl><Input {...field} type="tel" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number (Optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Number</FormLabel>
                  <FormControl><Input {...field} type="text" inputMode="numeric" pattern="[0-9]*" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryRadius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Radius (in km)</FormLabel>
                  <FormControl><Input {...field} type="number" onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value ?? ''} /></FormControl> {/* ✅ Handle empty string for input type number */}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={registerSellerMutation.isPending || isLoadingAuth || !isAuthenticated || !user?.uid || !user?.idToken}>
                {registerSellerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Register as Seller"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
      }
