// client/src/pages/seller-pending.tsx
import React from "react";
import { Clock } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center items-center mb-6">
          <Clock className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Application Under Review
        </h2>
        <p className="text-gray-600">
          Thank you for applying to become a seller on <strong>Shopnish</strong>. Our admin team is reviewing your application.
        </p>
        <p className="text-gray-500 mt-4">
          You will be notified once your account is approved.
        </p>
      </div>
    </div>
  );
}
