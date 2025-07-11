// client/src/pages/auth.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { getRedirectResult, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

const AuthRedirectHandler = () => {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);

    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ Redirect login successful:", result.user);

          // Store intent from localStorage
          const intent = localStorage.getItem("redirectIntent");

          if (intent === "become-seller") {
            router.push("/seller-apply");
          } else {
            router.push("/");
          }
        } else {
          console.log("ℹ️ No redirect result user.");
          router.push("/");
        }
      } catch (error) {
        console.error("❌ Error during redirect login:", error);
        router.push("/");
      }
    };

    handleRedirect();
  }, []);

  return <p className="text-center mt-10">🔄 Redirecting... Please wait.</p>;
};

export default AuthRedirectHandler;
