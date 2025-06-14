import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import Landing    from "@/pages/landing";
import Dashboard  from "@/pages/Dashboard";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center"}}>Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={ isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing/> } />

        {/* Private */}
        <Route path="/dashboard" element={ isAuthenticated ? <Dashboard/> : <Navigate to="/" replace /> } />

        {/* catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
