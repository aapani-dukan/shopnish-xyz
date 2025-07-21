// src/pages/auth-redirect-guard.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, getRedirectResult } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

const AuthRedirectGuard = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const auth = getAuth(app);
        const result = await getRedirectResult(auth);

        if (result?.user) {
          const token = await result.user.getIdToken();
          const email = result.user.email;

          // 🔐 Store token in localStorage
          localStorage.setItem("token", token);

          // 🔍 Hit backend to check if user is already an approved seller
          const response = await axios.get("/api/sellers/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const seller = response.data;

          // 🔐 Save user context (optional but useful)
          setUser({
            uid: result.user.uid,
            email: result.user.email ?? "",
            role: "seller", // or fetch from DB if you store it
          });

          if (seller.approvalStatus === "approved") {
            navigate("/seller-dashboard");
          } else {
            navigate("/register-seller");
          }
        } else {
          // If no redirect result, go back to home
          navigate("/");
        }
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/");
      }
    };

    handleRedirect();
  }, [navigate, setUser]);

  return <div className="text-center p-10">Authenticating...</div>;
};

export default AuthRedirectGuard;
