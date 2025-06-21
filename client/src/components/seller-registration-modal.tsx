// client/src/components/seller-registration-modal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/quetyClient";
import { useToast } from "@/hooks/use-toast";
import { useSellerRegistrationStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter"; // useLocation इम्पोर्ट करें
import { Store, CheckCircle, Clock, FileText, CreditCard, Phone } from "lucide-react";
import { z } from "zod";
import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // Firebase फंक्शन को इम्पोर्ट करें

const sellerFormSchema = insertSellerSchema.omit({ userId: true });

interface SellerRegistrationModalProps {
  isPageMode?: boolean; // नया प्रॉप
}

export default function SellerRegistrationModal({ isPageMode = false }: SellerRegistrationModalProps) {
  const { isOpen, close } = useSellerRegistrationStore();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Dialog की open स्थिति
  const dialogOpen = isPageMode ? isAuthenticated : isOpen;

  const form = useForm<z.infer<typeof sellerFormSchema>>({
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
    mutationFn: async (data: z.infer<typeof sellerFormSchema>) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }
      const payload = { ...data, userId: user.uid }; // userId को पेलोड में जोड़ें
      return await apiRequest("POST", "/api/sellers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      toast({
        title: "Registration Successful!",
        description: "Your seller account has been created. Verification is pending.",
      });
      form.reset();
      // पंजीकरण के बाद, उपयोगकर्ता को उनकी स्थिति दिखाने के लिए /seller-status पर रीडायरेक्ट करें
      if (isPageMode) {
        setLocation("/seller-status"); 
      } else {
        close();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register as seller. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof sellerFormSchema>) => {
    registerSellerMutation.mutate(data);
  };

  // यदि उपयोगकर्ता लॉग इन नहीं है और यह modal नहीं है, तो लॉगिन के लिए prompt करें
  if (!isAuthenticated && !isPageMode) {
    return (
      <Dialog open={dialogOpen} onOpenChange={close}>
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
            <p className="text-muted-foreground mb-4">
              Please log in to register as a seller on our platform.
            </p>
            <Button onClick={() => initiateGoogleSignInRedirect()} className="w-full">
              Login to Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // यदि उपयोगकर्ता लॉग इन नहीं है और यह पेज मोड है, तो इसे AppRouter में हैंडल किया जाएगा।
  if (!isAuthenticated && isPageMode) {
    return null; 
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={isPageMode ? () => setLocation("/") : close}>
      {/* Dialog content as you had it */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Store className="h-6 w-6 mr-2" />
            Become a Seller
          </DialogTitle>
          <p className="text-muted-foreground">
            Register your local grocery store or kirana shop for same-city delivery within 1 hour
          </p>
        </DialogHeader>

        {/* Benefits Section */}
        {/* ... (आपका मौजूदा कोड) ... */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Information */}
            {/* ... (आपका मौजूदा कोड) ... */}

            {/* Tax Information */}
            {/* ... (आपका मौजूदा कोड) ... */}

            {/* Banking Information */}
            {/* ... (आपका मौजूदा कोड) ... */}

            {/* Verification Notice */}
            {/* ... (आपका मौजूदा कोड) ... */}

            {/* Terms and Conditions */}
            {/* ... (आपका मौजूदा कोड) ... */}

            {/* Submit Button */}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={isPageMode ? () => setLocation("/") : close}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={registerSellerMutation.isPending}
                className="flex-1"
              >
                {registerSellerMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Registering...
                  </div>
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

    
