// client/src/components/seller/SellerOnboardingDialog.tsx
// यह अब केवल विक्रेता पंजीकरण फॉर्म को संभालता है।

"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth"; // ✅ सही इम्पोर्ट
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient"; // ✅ सही इम्पोर्ट
import { useToast } from "@/hooks/use-toast"; // ✅ सही इम्पोर्ट
import { useLocation } from "wouter";
import { Check, X, Store, Loader2, AlertCircle, Clock } from "lucide-react";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"; // ✅ सही इम्पोर्ट
import { ControllerRenderProps } from "react-hook-form"; // ✅ यह इम्पोर्ट 'field' टाइपिंग के लिए चाहिए

// Zod स्कीमा को seller-apply.ts राउट के अपेक्षित पेलोड से मैच करें
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
  // deliveryRadius को number के रूप में पार्स करने के लिए .transform() का उपयोग करें
  deliveryRadius: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= 1 && val <= 100, "Delivery radius must be a number between 1 and 100").default("5"),
  businessType: z.string().min(2, "Business Type is required.").max(50),
});

type FormData = z.infer<typeof sellerFormSchema>;

// SellerProfile टाइप डिफाइन करें (यह आपके बैकएंड से आना चाहिए)
interface SellerProfile {
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  // अन्य प्रॉपर्टीज जो आपके seller profile से आती हैं
}

interface SellerOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SellerOnboardingDialog({ isOpen, onClose }: SellerOnboardingDialogProps) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);

  // useQuery में सही टाइपिंग और 'user?.userId' का उपयोग
  const { data: existingSellerProfile, isLoading: isSellerProfileLoading } = useQuery<SellerProfile | null, Error>({
    queryKey: ["/api/sellers/me", user?.userId],
    queryFn: async () => {
      if (!user?.userId) {
        return null; // यदि यूजर आईडी नहीं है तो फ़ेच न करें
      }
      try {
        const response = await apiRequest("GET", `/api/sellers/me`);
        // सुनिश्चित करें कि डेटा SellerProfile टाइप का है
        return response.data as SellerProfile;
      } catch (error) {
        // AxiosError को सही ढंग से संभालें
        if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
          return null; // यदि 404 मिलता है तो कोई प्रोफाइल नहीं है
        }
        throw error; // अन्य त्रुटियों को re-throw करें
      }
    },
    // 'enabled' प्रॉपर्टी में null चेक को शामिल करें
    enabled: !isLoadingAuth && isAuthenticated && !!user?.userId,
    staleTime: Infinity, // डेटा को हमेशा 'fresh' मानें जब तक कि यह इनवैलिडेट न हो जाए
    // 'stateTime' नाम का कोई prop नहीं है, यह शायद 'staleTime' की गलती थी। इसे हटा दिया गया है।
    // cacheTime: 10 * 60 * 1000, // कैश को 10 मिनट के बाद साफ करें
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
      deliveryRadius: "5", // Zod स्कीमा में इसे string के रूप में रखा है क्योंकि इनपुट type="number" भी string देता है
    },
  });

  // mutationFn में AxiosResponse टाइपिंग को शामिल करें
  const registerSellerMutation = useMutation<any, Error, FormData>({ // SuccessData, ErrorType, VariablesType
    mutationFn: async (data: FormData) => {
      const payload = { ...data, deliveryRadius: parseFloat(data.deliveryRadius) }; // Zod transform से पहले इसे number में बदलें
      const response = await apiRequest("POST", "/api/sellers/apply", payload);
      return response.data; // Response का डेटा वापस करें, पूरा रिस्पांस नहीं
    },
    onSuccess: (data) => {
      setShowSuccess(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast({
        title: "Application Submitted!",
        description: data.message || "Your seller application has been submitted successfully.",
        variant: "default",
      });

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        setLocation("/seller-status");
      }, 2000);
    },
    onError: (error) => { // 'error' को 'any' के बजाय 'Error' टाइप करें
      toast({
        title: "Registration Failed",
        description: axios.isAxiosError(error) ? error.response?.data?.message || "Something went wrong. Please try again." : error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    registerSellerMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
    setShowSuccess(false);
  };

  if (!isOpen) {
    return null;
  }

  // --- लोडिंग और ऑथेंटिकेशन स्टेट हैंडलिंग ---
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
            <Button onClick={() => { handleClose(); setLocation("/auth"); }}>Go to Login Page</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // विक्रेता प्रोफ़ाइल लोडिंग
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

  // यदि विक्रेता प्रोफ़ाइल पहले से मौजूद है या लंबित है
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Status: {statusText}</h2>
            <p className="text-gray-600 mb-6">
              You have already submitted your seller application.
              {existingSellerProfile.approvalStatus === "rejected" && (
                <span className="block mt-2">Reason: {existingSellerProfile.rejectionReason || 'No specific reason provided.'}</span>
              )}
            </p>
            <Button onClick={() => { handleClose(); setLocation("/seller-status"); }}>
              View Full Status
            </Button>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">Your seller application has been submitted successfully. We'll review it and get back to you soon.</p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // --- मुख्य डायलॉग सामग्री: केवल पंजीकरण फॉर्म ---
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
            {/* Business Name Field */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }: { field: ControllerRenderProps<FormData, "businessName"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "businessAddress"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "businessType"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "description"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "city"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "pincode"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "businessPhone"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "gstNumber"> }) => ( // ✅ `field` को टाइप करें
                <FormItem>
                  <FormLabel>GST Number (Optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Bank Account Number Field */}
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }: { field: ControllerRenderProps<FormData, "bankAccountNumber"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "ifscCode"> }) => ( // ✅ `field` को टाइप करें
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
              render={({ field }: { field: ControllerRenderProps<FormData, "deliveryRadius"> }) => ( // ✅ `field` को टाइप करें
                <FormItem>
                  <FormLabel>Delivery Radius (in km)</FormLabel>
                  {/* `field.value` को `string` में बदलें, क्योंकि Input कंपोनेंट `value` को `string` के रूप में लेता है */}
                  <FormControl><Input {...field} type="number" value={String(field.value)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={registerSellerMutation.isPending}>
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
