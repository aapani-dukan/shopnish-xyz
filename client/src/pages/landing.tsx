import { Button } from "@/components/ui/button"; // or plain <button>
import { startGoogleRedirect } from "@/lib/firebase";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-100">
      <h1 className="text-2xl font-bold">Welcome! Please login.</h1>
      <Button onClick={startGoogleRedirect}>Continue with Google</Button>
    </div>
  );
}
