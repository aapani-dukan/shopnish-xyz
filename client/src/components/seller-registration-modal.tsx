import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSellerSchema } from "@shared/backend/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSellerRegistrationStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth"; // useAuth अभी भी user.uid के लिए चाहिए
import { useLocation } from "wouter";
import { Store } from "lucide-react";
import { z } from "zod";
// import { initiateGoogleSignInRedirect } from "@/lib/firebase"; // ✅ अब इसकी जरूरत नहीं

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { useEffect } from "react"; // ✅ इसकी भी अब जरूरत नहीं

const sellerFormSchema = insertSellerSchema.omit({ userId: true });

export default function SellerRegistrationModal() {
  const { isOpen, close } = useSellerRegistrationStore(); // `open` की यहाँ सीधे जरूरत नहीं
  const { user, isAuthenticated } = useAuth(); // isAuthenticated अभी भी चेक करना बेहतर है
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
      // ✅ यहाँ एक महत्वपूर्ण चेक: यदि उपयोगकर्ता प्रमाणित नहीं है, तो त्रुटि दें।
      // यह सुनिश्चित करता है कि फॉर्म केवल लॉग-इन उपयोगकर्ता ही भर सकें।
      if (!user?.uid || !isAuthenticated) {
        throw new Error("User is not authenticated. Please log in first.");
      }
      const payload = { ...data, userId: user.uid };
      return await apiRequest("POST", "/api/sellers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers/me"] });
      toast({
        title: "Registration Successful!",
        description: "Your seller account has been created. Admin verification is pending.",
      });
      form.reset();
      setLocation("/admin-dashboard"); // एडमिन डैशबोर्ड पर रीडायरेक्ट
      close(); // मॉडल बंद करें
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
    console.log("Form submitted!");
    console.log("Form data:", data);
    registerSellerMutation.mutate(data);
  };

  // ✅ मॉडल तभी रेंडर होगा जब `isOpen` true होगा।
  // और अगर यूजर लॉग इन नहीं है, तो उसे फॉर्म सबमिट करते समय error मिलेगी (mutationFn में)।
  if (!isOpen) {
    return null; // यदि मॉडल बंद है तो कुछ भी रेंडर न करें
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}> {/* `isOpen` से मॉडल की स्थिति नियंत्रित करें */}
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
            {/* ✅ आपके अन्य फॉर्म फ़ील्ड्स यहाँ जाएँगे */}
            {/* सुनिश्चित करें कि आपने `sellerFormSchema` के सभी फ़ील्ड्स को यहाँ जोड़ा है */}
            <FormField name="businessType" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Business Type</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., grocery, electronics" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="description" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="city" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="pincode" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Pincode</FormLabel>
                <FormControl><Input {...field} type="text" inputMode="numeric" pattern="[0-9]*" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="businessPhone" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Business Phone</FormLabel>
                <FormControl><Input {...field} type="tel" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="gstNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>GST Number</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="bankAccountNumber" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Account Number</FormLabel>
                <FormControl><Input {...field} type="text" inputMode="numeric" pattern="[0-9]*" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="ifscCode" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC Code</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField name="deliveryRadius" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Radius (in km)</FormLabel>
                <FormControl><Input {...field} type="number" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
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
