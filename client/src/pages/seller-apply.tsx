import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Store, ArrowLeft, Rocket, Percent, Zap, Headphones, Globe } from "lucide-react";
import { Link } from "wouter";
import SellerApplicationModal from "@/components/seller-application-modal";

export default function SellerApplyPage() {
  const { signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
          >
            <Store className="mr-3 w-5 h-5" />
            Click here
          </Button>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Percent className="text-green-600 w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Low Commission</h3>
            <p className="text-gray-600 text-sm">Competitive rates to maximize your profits</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="text-blue-600 w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Setup</h3>
            <p className="text-gray-600 text-sm">Get your store up and running quickly</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Headphones className="text-purple-600 w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-gray-600 text-sm">Dedicated support team to help you succeed</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Globe className="text-red-600 w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Global Reach</h3>
            <p className="text-gray-600 text-sm">Access customers from around the world</p>
          </div>
        </div>
      </main>

      <SellerApplicationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
