import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Store, ArrowLeft, Rocket, Percent, Zap, Headphones, Globe } from "lucide-react";
import { Link } from "wouter";
import SellerRegistrationModal from "@/components/seller-registration-modal";

export default function SellerApplyPage() {
  const { signOut } = useAuth();

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
          <p className="text-lg text-gray-600 mb-8">Start your selling journey with us. Complete your application to get approved as a seller.</p>
          
          {/* ✅ Button हटाओ – Modal PageMode में हमेशा खुला रहेगा */}
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* ...same cards... */}
        </div>
      </main>

      {/* ✅ Modal हमेशा दिखेगा isPageMode true से */}
      <SellerRegistrationModal isPageMode={true} />
    </div>
  );
}
