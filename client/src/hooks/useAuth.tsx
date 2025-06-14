import { useEffect, useState } from "react";
import { auth, getRedirectUser, listenAuth, firebaseSignOut } from "@/lib/firebase";

export function useAuth() {
  const [user,   setUser]   = useState<any|null>(null);
  const [loading,setLoad]   = useState(true);

  useEffect(() => {
    // 1️⃣ redirect result (first load after Google)
    (async () => {
      try {
        const res = await getRedirectUser();
        if (res?.user) setUser(res.user);
      } catch (e) { console.error(e); firebaseSignOut(); }
    })();

    // 2️⃣ listener – runs always
    const un = listenAuth(u => { setUser(u); setLoad(false); });
    return () => un();
  }, []);

  return { user, isAuthenticated: !!user, isLoading: loading };
}
