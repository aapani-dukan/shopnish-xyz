import { useEffect, useState } from "react";

// Define the structure of user data
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// This hook fetches authenticated user info from localStorage or backend
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate getting token from localStorage
    const token = localStorage.getItem("authToken");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Call backend to verify token and get user info
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Unauthorized");

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
}
