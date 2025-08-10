// client/src/pages/admin-login.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate(); 
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: 'include' // ✅ यहाँ भी इसे जोड़ें
      });

      if (!res.ok) {
        //...
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome Admin!",
      });

      navigate("/admin-dashboard", { replace: true });

    } catch (err: any) {
      //...
    } finally {
      setLoading(false);
    }
  };
  //...
}
