import { useState } from "react"; import { useMutation } from "@tanstack/react-query"; import { useLocation } from "wouter"; import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, } from "@/components/ui"; // ← barrel export (adjust if needed) import { Truck } from "lucide-react"; import { useToast } from "@/hooks/use-toast"; import { apiRequest } from "@/lib/queryClient";

/**

DeliveryLogin (simplified)

1️⃣ "Login"  ─ checks approval status → dashboard OR toast "please register first"

2️⃣ "Register" ─ navigates to /delivery-apply for form submission */ export default function DeliveryLogin() { const [, navigate] = useLocation(); const { toast }  = useToast();


const [email, setEmail] = useState(""); const [password, setPassword] = useState("");

/* ——— login mutation ——— */ const loginMutation = useMutation({ mutationFn: async (payload: { email: string; password: string }) => { // backend returns { approved: boolean, token: string, deliveryBoyId: string } return apiRequest("POST", "/api/delivery/login", payload).then(r => r.json()); }, onSuccess: (data) => { if (data.approved) { localStorage.setItem("deliveryBoyToken", data.token); localStorage.setItem("deliveryBoyId",   data.deliveryBoyId); navigate("/delivery-dashboard"); } else { toast({ title: "Approval Pending", description: "Please register first or wait for admin approval.", variant: "destructive", }); } }, onError: () => { toast({ title: "Login Failed", description: "Invalid credentials.", variant: "destructive", }); }, });

const handleLoginClick = () => { if (!email || !password) { toast({ title: "Required", description: "Enter email & password", variant: "destructive" }); return; } loginMutation.mutate({ email, password }); };

return ( <div className="min-h-screen flex items-center justify-center bg-blue-50 py-10 px-4"> <Card className="w-full max-w-md shadow-lg"> <CardHeader className="text-center space-y-2"> <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center"> <Truck className="w-8 h-8 text-white" /> </div> <CardTitle>Welcome Delivery Partner</CardTitle> <p className="text-sm text-gray-600">Choose an option below</p> </CardHeader> <CardContent className="space-y-6"> {/* simple email/password inputs */} <div className="space-y-4"> <div> <Label htmlFor="d-email">Email</Label> <Input id="d-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@delivery.com" /> </div> <div> <Label htmlFor="d-pass">Password</Label> <Input id="d-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" /> </div> </div>

<Button className="w-full" onClick={handleLoginClick} disabled={loginMutation.isPending}>
        {loginMutation.isPending ? "Checking…" : "Login"}
      </Button>

      <div className="flex items-center justify-center">
        <span className="text-xs text-gray-500">OR</span>
      </div>

      <Button variant="outline" className="w-full" onClick={() => navigate("/delivery-apply")}>  
        Register as Delivery Boy
      </Button>
    </CardContent>
  </Card>
</div>

); }

                                                                
