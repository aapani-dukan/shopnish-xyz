// client/src/pages/auth.tsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectResult, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

const AuthRedirectHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth(app);

    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ Redirect login successful:", result.user);

          const intent = localStorage.getItem("redirectIntent");
          if (intent === "become-seller") {
            navigate("/seller-apply");
          } else {
            navigate("/");
          }
        } else {
          console.log("ℹ️ No redirect result user.");
          navigate("/");
        }
      } catch (error) {
        console.error("❌ Error during redirect login:", error);
        navigate("/");
      }
    };

    handleRedirect();
  }, [navigate]);

  return <p className="text-center mt-10">🔄 Redirecting... Please wait.</p>;
};

export default AuthRedirectHandler;
