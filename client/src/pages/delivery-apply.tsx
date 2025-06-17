import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryBoy } from "@/hooks/useDeliveryBoy";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      fullName: deliveryUser?.fullName || "",
      phone: deliveryUser?.phone || "",
      address: deliveryUser?.address || "",
      vehicleType: deliveryUser?.vehicleType || "",
    },
  });

  const onSubmit = async (data: DeliveryApplyData) => {
    try {
      const res = await fetch("/api/delivery/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Application failed");

      toast({
        title: "Application submitted!",
        description: "Wait for admin approval.",
      });

      fetchDeliveryUser(); // refresh data

    } catch (error) {
      toast({
        title: "Something went wrong!",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Delivery Boy Application</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Full Name</Label>
          <Input {...register("fullName")} />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <Label>Phone Number</Label>
          <Input type="tel" {...register("phone")} />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label>Address</Label>
          <Textarea rows={3} {...register("address")} />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div>
          <Label>Vehicle Type</Label>
          <Input placeholder="e.g., Bike, Scooter" {...register("vehicleType")} />
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
