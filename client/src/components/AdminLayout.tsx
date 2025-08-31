import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen font-inter bg-gray-50">
      <aside className="w-64 bg-gray-800 text-white p-4 space-y-2">
        <h1 className="text-xl font-bold mb-4">एडमिन पैनल</h1>
        <nav className="flex flex-col space-y-2">
          <Button asChild variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Link to="dashboard">डैशबोर्ड</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-start text-white hover:bg-gray-700">
            <Link to="categories">कैटेगरीज़</Link>
          </Button>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

