import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import axios from "axios";

// Schema for validation
const sellerSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessAddress: z.string().optional(),
  phoneNumber: z.string().min(10, "Phone number is required"),
});

type SellerFormData = z.infer<typeof sellerSchema>;

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function SellerRegistrationForm({ onBack, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
  });

  const onSubmit = async (data: SellerFormData) => {
    setLoading(true);
    setMessage("");

    try {
      // Dummy userId for now — replace with real logged-in user ID
      const userId = 1;

      const response = await axios.post("/api/sellers/apply", {
        userId,
        ...data,
      });

      setMessage(response.data.message || "Application submitted");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-4">
      <div>
        <Label>Business Name</Label>
        <Input {...register("businessName")} />
        {errors.businessName && <p className="text-red-500 text-sm">{errors.businessName.message}</p>}
      </div>

      <div>
        <Label>Business Address</Label>
        <Input {...register("businessAddress")} />
      </div>

      <div>
        <Label>Phone Number</Label>
        <Input {...register("phoneNumber")} />
        {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>}
      </div>

      {message && <p className="text-sm text-blue-600">{message}</p>}

      <div className="flex gap-2 justify-end mt-4">
        <Button type="button" variant="secondary" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
      </div>
    </form>
  );
}
