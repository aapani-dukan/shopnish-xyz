// client/src/pages/seller-apply.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Store, ArrowLeft, Rocket, Percent, Zap, Headphones, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";
import SellerOnboardingDialog from "@/components/seller/SellerOnboardingDialog";

export default function SellerApplyPage() {
  const { user, isAuthenticated, isLoadingAuth, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!isAuthenticated) {
      console.log("SellerApplyPage: Not authenticated, redirecting to login.");
      navigate("/auth?next=seller-apply"); // ✅ intent param pass करें
      return;
    }

    if (user?.role === "seller") {
      if (user.approvalStatus === "approved") {
        navigate("/seller-dashboard");
        return;
      } else if (user.approvalStatus === "pending") {
        navigate("/seller-status");
        return;
      }
    }
  }, [isAuthenticated, isLoadingAuth, user, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-700">Loading seller application status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                <Store className="text-white text-sm w-4 h-4" />
              </div>
              <span className="font-semibold text-gray-900">Seller Application</span>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Rocket className="text-amber-600 text-2xl w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">The way is here</h1>
          <p className="text-lg text-gray-600 mb-8">
            Start your selling journey with us. Complete your application to get approved as a seller.
          </p>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
          >
            <Store className="mr-3 w-5 h-5" />
            Click here
          </Button>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { icon: <Percent className="text-green-600 w-6 h-6" />, title: "Low Commission" },
            { icon: <Zap className="text-blue-600 w-6 h-6" />, title: "Fast Setup" },
            { icon: <Headphones className="text-purple-600 w-6 h-6" />, title: "24/7 Support" },
            { icon: <Globe className="text-red-600 w-6 h-6" />, title: "Global Reach" },
          ].map(({ icon, title }) => (
            <div key={title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">Benefit description here</p>
            </div>
          ))}
        </div>
      </main>

      <SellerOnboardingDialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
