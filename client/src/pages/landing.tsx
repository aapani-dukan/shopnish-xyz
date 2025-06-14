import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, getRedirectUser, startGoogleRedirect } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🔍 Handle redirect result once
    getRedirectUser()
      .then((result) => {
        if (result?.user) {
          navigate("/dashboard"); // ✅ login success → go to dashboard
        }
      })
      .catch(console.error);

    // 🧠 If already logged in (from before)
    onAuthStateChanged(auth, (user) => {
      if (user) navigate("/dashboard");
    });
  }, []);

  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={startGoogleRedirect}>
        Continue with Google
      </button>
    </div>
  );
}
