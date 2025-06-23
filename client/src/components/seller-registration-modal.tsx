// client/src/components/seller-registration-modal.tsx


import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // यह आपका सही input.tsx से है
import { Textarea } from "@/components/ui/textarea"; // Textarea भी इम्पोर्टेड होना चाहिए
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema"; // आपका सही schema पाथ
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Store, Check, X } from "lucide-react";
import { z } from "zod";

// ✅ इन कंपोनेंट्स को `@/components/ui/form` से इम्पोर्ट करें
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

// Schema for the seller form, omitting userId as it's added at runtime
const sellerFormSchema = insertSellerSchema.omit({ userId: true });

type FormData = z.infer<typeof sellerFormSchema>;

interface SellerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerRegistrationModal({ isOpen, onClose }: SellerRegistrationModalProps) {
  const { user, isAuthenticated } = useAuth(); // useAuth hook to get user and auth status
  const { toast } = useToast(); // For displaying toasts
  const queryClient = useQueryClient(); // For invalidating queries on success
  const [, setLocation] = useLocation(); // For Wouter navigation
  const [showSuccess, setShowSuccess] = useState(false); // State to control success message display

  // Initialize react-hook-form
  const form = useForm<FormData>({
    resolver: zodResolver(sellerFormSchema), // Zod for schema validation
    defaultValues: {
      businessName: "",
      businessType: "grocery", // Default to grocery, or adjust as needed
      description: "",
      businessAddress: "",
      city: "",
      pincode: "",
      businessPhone: "",
      gstNumber: "",
      bankAccountNumber: "",
      ifscCode: "",
      deliveryRadius: 5, // Default delivery radius
    },
  });

  // TanStack Query mutation for seller registration
  const registerSellerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Critical check: Ensure user is authenticated before attempting to submit
      if (!user?.uid || !isAuthenticated) {
        throw new Error("User is not authenticated. Please log in first to submit the form.");
      }
      // Combine form data with the authenticated user's ID
      const payload = { ...data, userId: user.uid };
      // Make the API request
      const response = await apiRequest("POST", "/api/sellers", payload);
      return response;
    },
    onSuccess: () => {
      setShowSuccess(true); // Show success message
      form.reset(); // Reset the form fields
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] }); // Invalidate relevant queries
      
      // Close the modal and redirect after a short delay
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setLocation("/admin-dashboard"); // Redirect to admin dashboard
      }, 2000); // 2-second delay
    },
    onError: (error: any) => {
      // Display error toast if mutation fails
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormData) => {
    console.log("Form submitted!"); // ✅ This should now appear in the console!
    console.log("Form data:", data); // ✅ And your form data should be logged!
    registerSellerMutation.mutate(data); // Trigger the mutation
  };

  // Handler for closing the modal
  const handleClose = () => {
    form.reset(); // Reset form when modal is closed
    onClose(); // Call parent's onClose handler
    setShowSuccess(false); // Reset success state
  };

  // Render success message dialog if showSuccess is true
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

  // Do not render anything if the modal is not open
  if (!isOpen) {
    return null;
  }

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

        {/* ✅ Wrap your form with <Form {...form}> */}
        <Form {...form}>
          {/* ✅ Use form.handleSubmit(onSubmit) on the <form> element */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Business Name Field */}
            <FormField
              control={form.control} // Pass form.control to FormField
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl> {/* ✅ Pass {...field} to Input */}
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Business Address Field */}
            <FormField
              control={form.control}
              name="businessAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl> {/* ✅ Pass {...field} to Textarea */}
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Business Type Field */}
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
            {/* Description Field */}
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
            {/* City Field */}
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
            {/* Pincode Field */}
            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  {/* Ensure type="text" with inputMode="numeric" and pattern for pincode */}
                  <FormControl><Input {...field} type="text" inputMode="numeric" pattern="[0-9]*" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Business Phone Field */}
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
            {/* GST Number Field */}
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Bank Account Number Field */}
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
            {/* IFSC Code Field */}
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
            {/* Delivery Radius Field */}
            <FormField
              control={form.control}
              name="deliveryRadius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Radius (in km)</FormLabel>
                  {/* Ensure type="number" for numeric input */}
                  <FormControl><Input {...field} type="number" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={registerSellerMutation.isPending}>
                {registerSellerMutation.isPending ? "Registering..." : "Register as Seller"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
