import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryBoy } from "@/hooks/useDeliveryBoy";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Assuming you have a way to get the current Firebase user
import { getAuth } from "firebase/auth";

const deliveryApplySchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Address is required"),
  vehicleType: z.string().min(2, "Vehicle type is required"),
});

type DeliveryApplyData = z.infer<typeof deliveryApplySchema>;

export default function DeliveryApplyPage() {
  const { toast } = useToast();
  const { deliveryUser, fetchDeliveryUser } = useDeliveryBoy();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryApplyData>({
    resolver: zodResolver(deliveryApplySchema),
    defaultValues: {
      fullName: deliveryUser?.name || "", // Assuming deliveryUser.name is the correct field
      phone: deliveryUser?.phone || "",
      address: deliveryUser?.address || "",
      vehicleType: deliveryUser?.vehicleType || "",
    },
  });

  const onSubmit = async (data: DeliveryApplyData) => {
    // 1. Get the current authenticated user and their token
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your application.",
        variant: "destructive",
      });
      return;
    }

    let token;
    try {
      token = await user.getIdToken();
    } catch (tokenError) {
      console.error("Failed to get Firebase token:", tokenError);
      toast({
        title: "Authentication Error",
        description: "Could not get user token. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // 2. Make the API call with the correct Authorization header
    try {
      const res = await fetch("/api/delivery-boys/register", {
  

        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Use the correct token here
        },
        body: JSON.stringify(data),
      });

      // 3. Improve error handling to read the server response properly
      if (!res.ok) {
        let errorMessage = "Application failed. Please try again.";
        try {
          // Attempt to parse a JSON error message from the server
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          // Fallback if the server didn't send JSON
          errorMessage = `Server responded with status ${res.status}.`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Application submitted!",
        description: "Wait for admin approval.",
      });

      if (typeof fetchDeliveryUser === 'function') {
  fetchDeliveryUser();
}


    } catch (error: any) {
      console.error("Application submission failed:", error);
      toast({
        title: "Something went wrong!",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Delivery Boy Application</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" type="tel" {...register("phone")} />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" rows={3} {...register("address")} />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="vehicleType">Vehicle Type</Label>
          <Input id="vehicleType" placeholder="e.g., Bike, Scooter" {...register("vehicleType")} />
          {errors.vehicleType && (
            <p className="text-sm text-red-500">{errors.vehicleType.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Apply"}
        </Button>
      </form>
    </div>
  );
}
