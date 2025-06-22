import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSellerRegistrationStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Store } from "lucide-react";
import { z } from "zod";
import { initiateGoogleSignInRedirect } from "@/lib/firebase";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const sellerFormSchema = insertSellerSchema.omit({ userId: true });

interface SellerRegistrationModalProps {
  isPageMode?: boolean;
}

export default function SellerRegistrationModal({ isPageMode = false }: SellerRegistrationModalProps) {
  const { isOpen, close } = useSellerRegistrationStore();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
      if (!user?.uid) throw new Error("User not authenticated");
      const payload = { ...data, userId: user.uid };
      return await apiRequest("POST", "/api/sellers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      toast({
        title: "Registration Successful!",
        description: "Your seller account has been created. Verification is pending.",
      });
      form.reset();
      isPageMode ? setLocation("/seller-status") : close();
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof sellerFormSchema>) => {
    registerSellerMutation.mutate(data);
  };

  if (!isAuthenticated && isPageMode) return null;

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
            <p className="text-muted-foreground mb-4">Please log in to register as a seller.</p>
            <Button onClick={initiateGoogleSignInRedirect} className="w-full">
              Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={isPageMode ? () => setLocation("/") : close}>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="businessName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="businessAddress" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Business Address</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={isPageMode ? () => setLocation("/") : close}>Cancel</Button>
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
