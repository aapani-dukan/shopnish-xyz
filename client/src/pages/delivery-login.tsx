import { useState } from "react"; import { useMutation } from "@tanstack/react-query"; import { useLocation } from "wouter"; import { Button } from "@/components/ui/button"; import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; import { Input } from "@/components/ui/input"; import { Label } from "@/components/ui/label"; import { useToast } from "@/hooks/use-toast"; import { apiRequest } from "@/lib/queryClient"; import { Truck, User, Lock } from "lucide-react"; import { getAuth, signInWithRedirect, GoogleAuthProvider } from "firebase/auth"; import { app } from "@/lib/firebase";

export default function DeliveryLogin() { const [, navigate] = useLocation(); const { toast } = useToast();

const [credentials, setCredentials] = useState({ email: "", password: "" });

const loginMutation = useMutation({ mutationFn: async (loginData: { email: string; password: string }) => { return await apiRequest("POST", "/api/delivery/login", loginData); }, onSuccess: (data) => { localStorage.setItem("deliveryBoyToken", data.token); localStorage.setItem("deliveryBoyId", data.user.id); toast({ title: "Login Successful", description: Welcome back, ${data.user.firstName}!, }); navigate("/delivery-dashboard"); }, onError: (error) => { toast({ title: "Login Failed", description: "Invalid email or password. Please try again.", variant: "destructive", }); }, });

const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (!credentials.email || !credentials.password) { toast({ title: "Required Fields", description: "Please enter both email and password", variant: "destructive", }); return; } loginMutation.mutate(credentials); };

const handleGoogleLogin = () => { const auth = getAuth(app); const provider = new GoogleAuthProvider(); signInWithRedirect(auth, provider); };

return ( <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4"> <div className="max-w-md w-full"> <div className="text-center mb-8"> <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4"> <Truck className="w-8 h-8 text-white" /> </div> <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Partner</h1> <p className="text-gray-600">Sign in to your delivery dashboard</p> </div>

<Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-center">Welcome Back</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                placeholder="Enter your email"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Enter your password"
                className="pl-10"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</p>
          <div className="space-y-1 text-sm text-blue-700">
            <p>Email: ravi.delivery@shopnish.com</p>
            <p>Password: delivery123</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setCredentials({
              email: "ravi.delivery@shopnish.com",
              password: "delivery123"
            })}
          >
            Use Demo Credentials
          </Button>
        </div>

        <Button 
          variant="outline"
          className="mt-4 w-full"
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </Button>
      </CardContent>
    </Card>

    <div className="text-center mt-6">
      <p className="text-sm text-gray-600">
        Need help? Contact support at support@shopnish.com
      </p>
    </div>
  </div>
</div>

); }

