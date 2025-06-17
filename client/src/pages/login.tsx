// src/pages/Login.tsx
import { signInWithGoogle } from "@/lib/firebase";   // 🔄 popup flow
import "@/index.css";                                // (optional) global styles

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGooglePopup = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();           // 🔄 Popup flow
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome – Please Log In
        </h2>

        <button
          onClick={handleGooglePopup}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-white shadow hover:bg-blue-700"
        >
          {/* Google icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26
              1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92
              3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23
              1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99
              20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.2-.66-.35-1.36-.35-1.91s.13-1.43.35-1.91V7.07H.86C.3
              7.82 0 9.3 0 10.5c0 1.2.3 2.68.86 3.92L4.3 13.91z" />
            <path d="M12 4.1c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45
              2.09 14.97.999 12 .999 7.7.999 3.99 3.47 2.18 7.07l3.66
              2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
