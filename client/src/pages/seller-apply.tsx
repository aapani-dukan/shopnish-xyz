// src/pages/seller-apply.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";

const formSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(5, "Address is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function RegisterSeller() {
  const navigate = useNavigate();
  const { user, seller, loading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/");
      } else if (seller?.approvalStatus === "approved") {
        navigate("/seller-dashboard");
      }
    }
  }, [user, seller, loading, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await axios.post("/api/sellers/apply", {
        ...data,
        userId: user?.uid,
        email: user?.email,
      });

      if (res.status === 200) {
        toast.success("Seller application submitted successfully!");
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-center">Become a Seller</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-medium">Business Name</label>
          <input
            type="text"
            {...register("businessName")}
            className="w-full border p-2 rounded mt-1"
          />
          {errors.businessName && (
            <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
          )}
        </div>

        <div>
          <label className="block font-medium">Phone Number</label>
          <input
            type="text"
            {...register("phoneNumber")}
            className="w-full border p-2 rounded mt-1"
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div>
          <label className="block font-medium">Address</label>
          <textarea
            {...register("address")}
            className="w-full border p-2 rounded mt-1"
          />
          {errors.address && (
            <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          Submit Application
        </button>
      </form>
    </div>
  );
}
