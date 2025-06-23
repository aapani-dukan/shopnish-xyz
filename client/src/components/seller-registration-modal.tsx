// client/src/components/seller-registration-modal.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
// ✅ useQuery को भी इम्पोर्ट करें
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sellers } from "@shared/backend/schema"; // आपका अपडेटेड sellers Zod स्कीमा
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Check, X, Store, Loader2 } from "lucide-react"; // Loader2 आइकन लोडिंग स्टेट के लिए
import { z } from "zod";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const sellerFormSchema = sellers.omit({ 
  id: true, 
  userId: true, 
  email: true, 
  phone: true, 
  address: true, 
  approvalStatus: true, 
  approvedAt: true, 
  rejectionReason: true, 
  createdAt: true, 
  updatedAt: true 
});

type FormData = z.infer<typeof sellerFormSchema>;

interface SellerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerRegistrationModal({ isOpen, onClose }: SellerRegistrationModalProps) {
  const { user, isAuthenticated,isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const { data: existingSellerProfile, isLoading: isSellerProfileLoading } = useQuery({
    queryKey: ["/api/sellers/me", user?.uuid], // ✅ user.id का उपयोग करें, न कि user.uid (आपका 'User' स्कीमा ID का उपयोग करता है)
    queryFn: async () => {
      // ✅ अब हम सुनिश्चित हैं कि user ऑब्जेक्ट मौजूद है क्योंकि !isAuthenticated चेक इससे पहले आता है
      if (!user?.uuid) { 
        return null;
      }
      try {
        const response = await apiRequest("GET", `/api/sellers/me`);
        return response.data; 
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          return null; 
        }
        throw error; 
      }
    },
    // ✅ Enabled तभी जब ऑथेंटिकेशन लोडिंग खत्म हो और यूजर ऑब्जेक्ट में ID हो
    enabled: !isLoadingAuth && !!user?.uuid, 
    staleTime: Infinity, 
    cacheTime: 10 * 60 * 1000, 
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
      deliveryRadius: 5,
    },
  });

  const registerSellerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // ✅ अब यहां सीधे एरर थ्रो नहीं करेंगे, बल्कि सुनिश्चित करेंगे कि userId उपलब्ध है
      if (!user?.uuid) {
        // यह स्थिति केवल तभी आनी चाहिए जब enabled: !!user?.uid काम न कर रहा हो
        // या ऑथेंटिकेशन स्टेट में बहुत गंभीर समस्या हो।
        // इसे एक अलग प्रकार की त्रुटि के रूप में मानें।
        console.error("Attempted to submit form without a valid user ID.");
        throw new Error("Authentication state is unstable. Please try logging out and logging back in.");
      }
      const payload = { ...data, userId: user.uuid };
      const response = await apiRequest("POST", "/api/sellers", payload);
      return response;
    },
    onSuccess: () => {
      setShowSuccess(true);
      form.reset();
      // ✅ यह सुनिश्चित करने के लिए कि मौजूदा प्रोफ़ाइल की स्थिति अपडेट हो जाए,
      // इसे इनवैलिडेट करें ताकि useQuery फिर से Fetch करे।
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] }); 
      
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setLocation("/admin-dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submitted!");
    console.log("Form data:", data);
    registerSellerMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
    setShowSuccess(false);
  };

  // यदि मॉडल खुला नहीं है तो कुछ भी रेंडर न करें
  if (!isOpen) {
    return null;
  }

  // ✅ लोडिंग स्टेटस को हैंडल करें
  if (isLoadingAuth) {
      return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-md">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Login...</h2>
              <p className="text-gray-600">Please wait while we confirm your login status.</p>
            </div>
          </DialogContent>
        </Dialog>
      );
  }

   if (!isAuthenticated) {
     return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-600 text-2xl w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              It seems you're not logged in or your session has expired. Please log in to your account to register as a seller.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
   }

  if (isSellerProfileLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking Registration Status...</h2>
            <p className="text-gray-600">Please wait while we check if you've already registered.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

    if (existingSellerProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="text-blue-600 text-2xl w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-gray-600 mb-6">
              You have already submitted your seller application. Current status: <span className="font-semibold text-blue-700">{existingSellerProfile.approvalStatus || 'pending'}</span>.
              Please wait for approval. We'll notify you once it's reviewed.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    }

  
  
  // यदि सफलता मैसेज दिखाना है तो यह रेंडर होगा
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
            <Button onClick={handleClose}>Close</Button> {/* Add close button for success state */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  
  // ✅ मुख्य फ़ॉर्म रेंडर करें यदि कोई मौजूदा प्रोफ़ाइल नहीं है और ऑथेंटिकेटेड है
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Business Name Field */}
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
            {/* Business Address Field */}
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
