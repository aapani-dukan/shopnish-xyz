import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/"); // Not logged in? ⛔ go to login
      }
    });
  }, []);

  return (
    <div>
      <h1>Welcome to Dashboard</h1>
      <button onClick={() => signOut(auth).then(() => navigate("/"))}>
        Logout
      </button>
    </div>
  );
}
