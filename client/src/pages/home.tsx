import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-xl">Hi, {user?.displayName ?? user?.email} 👋</h2>
      <button
        onClick={logout}
        className="px-4 py-2 rounded bg-red-600 text-white"
      >
        Log out
      </button>
    </div>
  );
}
