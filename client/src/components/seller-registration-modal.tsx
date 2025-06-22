// client/src/components/seller-registration-modal.tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSellerRegistrationStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Store, CheckCircle, Clock, FileText, CreditCard, Phone,
} from "lucide-react";
import { z } from "zod";
import { initiateGoogleSignInRedirect } from "@/lib/firebase";

const sellerFormSchema = insertSellerSchema.omit({ userId: true });

interface SellerRegistrationModalProps {
  isPageMode?: boolean;
}

export default function SellerRegistrationModal({
  isPageMode = false,
}: SellerRegistrationModalProps) {
  const { isOpen, close } = useSellerRegistrationStore();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  /** 🔑 Modal open condition */
  const dialogOpen = isPageMode || isOpen;   // <-- यही मुख्य fix

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

  const registerSeller = useMutation({
    mutationFn: async (data: z.infer<typeof sellerFormSchema>) => {
      if (!user?.id) throw new Error("User not authenticated");

      return apiRequest("POST", "/api/sellers", {
        ...data,
        userId: user.id,      // अपनी schema में id/uid जो हो वही रखें
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Registration Successful!",
        description: "Your application is pending approval.",
      });
      form.reset();
      isPageMode ? navigate("/seller-status") : close();
    },
    onError: (err: any) => {
      toast({
        title: "Registration Failed",
        description: err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  /* --------  Login Prompt (modal mode) ---------- */
  if (!isAuthenticated && !isPageMode) {
    return (
      <Dialog open={dialogOpen} onOpenChange={close}>
        <DialogContent className="max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Store className="w-5 h-5 mr-2" />
              Join as a Seller
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🔐</div>
            <p className="mb-4 text-muted-foreground">
              Please log in to register as a seller on our platform.
            </p>
            <Button className="w-full" onClick={initiateGoogleSignInRedirect}>
              Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ---------  Page-mode but not logged-in => Router ने handle किया होगा ---------- */
  if (!isAuthenticated && isPageMode) return null;

  /* ---------------  Main Registration Form --------------- */
  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={isPageMode ? () => navigate("/") : close}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Store className="h-6 w-6 mr-2" />
            Become a Seller
          </DialogTitle>
          <p className="text-muted-foreground">
            Register your local grocery or kirana shop for 1-hour intra-city delivery.
          </p>
        </DialogHeader>

        {/* --- FORM --- */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => registerSeller.mutate(d))}
            className="space-y-6"
          >
            {/* सिर्फ एक फ़ील्ड का डेमो; बाक़ी आप add करें */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Gupta Kirana Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TODO: बाकी फ़ॉर्म फ़ील्ड्स यहाँ जोड़ें */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={isPageMode ? () => navigate("/") : close}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={registerSeller.isPending}
              >
                {registerSeller.isPending ? "Registering…" : "Register as Seller"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
