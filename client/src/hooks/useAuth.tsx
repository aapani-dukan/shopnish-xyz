import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string; // "customer" | "seller" | "admin" etc.
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken"); // JWT token

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Invalid token or user not found");
        }

        const data = await response.json();
        setUser(data.user); // must match backend response structure
      } catch (error) {
        console.error("Authentication failed:", error);
        localStorage.removeItem("authToken"); // Optional: logout if token invalid
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
}
