// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth"; // Make sure the path is correct

import Login from "@/pages/Login"; // Make sure the path is correct
import Dashboard from "@/pages/Dashboard"; // Make sure the path is correct

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show a loading screen while authentication state is being determined
  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        color: "#555",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#fff"
      }}>
        Loading authentication...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Login Page */}
        {/* If authenticated, redirect to Dashboard; otherwise, show Login page */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Private Route: Dashboard Page */}
        {/* If authenticated, show Dashboard; otherwise, redirect to Login page */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />}
        />

        {/* Catch-all route: Redirects any unknown path to the home page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
